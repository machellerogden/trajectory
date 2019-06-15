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
        this.on('data', async data => {
            const { name, result } = data;
            this.reporter.succeed(name);
            console.log(result);
        });
        this.on('error', async data => {
            const { name, error } = await data;
            this.reporter.fail(name);
            console.log(error);
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

            function * emit(result) {
                $this.emit('data', { name, result });
                yield { name, result };
            }

            while (true) {
                try {
                    switch (state.type) {
                        case 'task':
                            io = await state.fn(await io)
                            yield* emit(io);
                            if (state.end) return;
                            next();
                            break;
                        case 'pass':
                            if (state.result != null) {
                                io = await state.result;
                            }
                            yield* emit(io);
                            next();
                            break;
                        case 'wait':
                            if (state.seconds) {
                                await sleep(state.seconds);
                            } else if (state.secondsPath) {
                                await sleep(get(io, state.secondsPath));
                            }
                            yield* emit(io);
                            next();
                            break;
                        case 'succeed':
                            yield* emit(io);
                            return;
                        case 'fail':
                            yield* emit(io);
                            // TODO: emit error
                            console.error('fail');
                            process.exit(1);
                        case 'parallel':
                            io = await Promise.all(state.branches.map(branch => $this.executeBranch(branch, clone(io))));
                            yield* emit(io);
                            if (state.end) return;
                            next();
                            break;
                        case 'choice':
                            // TODO
                            break;
                        default:
                            // TODO: emit error
                            console.error('fail');
                            process.exit(1);
                            break;

                    }
                } catch (e) {
                    // TODO: emit error
                    console.error('fail', e);
                    process.exit(1);
                    break;
                }
            }
        }
        yield * await loop(states, startAt);
    }

    async executeBranch(queue, input) {
        const results = [];
        for await (const data of this.schedule(queue, input)) {
            results.push(data.result);
        }
        return results;
    }
}

module.exports = { Trajectory };
