'use strict';

// TODO
const DEBUG = true;

const { EventEmitter } = require('events');
const ora = require('ora');
const chalk = require('chalk');
const get = require('lodash/get');

const { schema } = require('./lib/schema');
const { sleep } = require('./lib/util');
const { clone } = require('mediary');
const { inspect } = require('util');

const msgTypes = [ 'succeed', 'fail', 'info', 'warn' ];

function DefaultReporter(options) {
    const reporter = ora(options);
    return reporter;
}

class Trajectory extends EventEmitter {

    constructor({
        debug = false,
        reporter = DefaultReporter()
    }) {
        super();
        this.reporter = reporter;
        msgTypes.forEach(msgType =>
            this.on(msgType, async ({ name, data }) => {
                this.reporter[msgType](name);
                if (debug) this.reporter.info(`${inspect(await data, { colors: true })}`);
            }));
    }

    async execute(definition, input) {
        const { spec:queue } = await schema.validate(definition);
        const results = [];
        this.reporter.start('');
        for await (const result of this.schedule(queue, input)) {
            results.push(result);
        }
        return results;
    }

    async * schedule(queue, io) {
        const { startAt, states } = queue;
        const $this = this;

        async function* loop(state, start) {
            let name; 

            if (start) {
                name = start;
                state = state[start];
            }

            function next() {
                name = state.next;
                state = states[state.next];
            }

            function * emit(type, data) {
                $this.emit(type, { name, data });
                yield { name, data };
            }

            while (true) {
                try {
                    switch (state.type) {
                        case 'task':
                            io = await state.fn(await io)
                            yield* emit('succeed', io);
                            if (state.end) return;
                            next();
                            break;
                        case 'pass':
                            if (state.result != null) {
                                io = await state.result;
                            }
                            yield* emit('succeed', io);
                            next();
                            break;
                        case 'wait':
                            if (state.seconds) {
                                await sleep(state.seconds);
                            } else if (state.secondsPath) {
                                await sleep(get(io, state.secondsPath));
                            }
                            yield* emit('succeed', io);
                            next();
                            break;
                        case 'succeed':
                            yield* emit('succeed', io);
                            return;
                        case 'fail': {
                            const err = { name, io };
                            if (state.error) err.error = state.error;
                            if (state.cause) err.cause = state.cause;
                            yield* emit('fail', err);
                            return;
                        }
                        case 'parallel':
                            io = await Promise.all(state.branches.map(branch => $this.executeBranch(branch, clone(io))));
                            yield* emit('succeed', io);
                            if (state.end) return;
                            next();
                            break;
                        case 'choice':
                            // TODO
                            break;
                        default:
                            yield* emit('fail', { message: `\`type\` of "${state.type}" for "${name}" not found.`});
                            break;

                    }
                } catch (e) {
                    yield* emit('fail', e);
                    return;
                }
            }
        }
        yield * await loop(states, startAt);
    }

    async executeBranch(queue, input) {
        const results = [];
        for await (const result of this.schedule(queue, input)) {
            results.push(result.data);
        }
        return results;
    }
}

module.exports = { Trajectory };
