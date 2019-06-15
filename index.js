'use strict';

const { EventEmitter } = require('events');
const ora = require('ora');
const chalk = require('chalk');
const get = require('lodash/get');

const { schema } = require('./lib/schema');
const { sleep } = require('./lib/util');
const { clone } = require('mediary');

class Trajectory extends EventEmitter {

    constructor(reporter = ora()) {
        super();
        this.reporter = reporter;
        this.on('data', async msg => {
            const { name, data } = msg;
            this.reporter.succeed(name);
            console.log(data);
        });
        this.on('error', async msg => {
            const { name, data } = await msg;
            this.reporter.fail(name);
            console.error(data);
            process.exit(1);
        });
    }

    async execute(definition, input) {
        this.reporter.start();
        const { spec:queue } = await schema.validate(definition);
        const results = [];
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
                            yield* emit('data', io);
                            if (state.end) return;
                            next();
                            break;
                        case 'pass':
                            if (state.result != null) {
                                io = await state.result;
                            }
                            yield* emit('data', io);
                            next();
                            break;
                        case 'wait':
                            if (state.seconds) {
                                await sleep(state.seconds);
                            } else if (state.secondsPath) {
                                await sleep(get(io, state.secondsPath));
                            }
                            yield* emit('data', io);
                            next();
                            break;
                        case 'succeed':
                            yield* emit('data', io);
                            return;
                        case 'fail': {
                            const err = { name, io };
                            if (state.error) err.error = state.error;
                            if (state.cause) err.cause = state.cause;
                            yield* emit('error', err);
                            return;
                        }
                        case 'parallel':
                            io = await Promise.all(state.branches.map(branch => $this.executeBranch(branch, clone(io))));
                            yield* emit('data', io);
                            if (state.end) return;
                            next();
                            break;
                        case 'choice':
                            // TODO
                            break;
                        default:
                            yield* emit('error', { message: `\`type\` of "${state.type}" for "${name}" not found.`});
                            break;

                    }
                } catch (e) {
                    yield* emit('error', e);
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
