'use strict';

const { EventEmitter } = require('events');
const pauseable = require('pauseable');
const ora = require('ora');
const chalk = require('chalk');
const get = require('lodash/get');

const { MAX_EVENT_COUNT } = require('./lib/constants');
const { schema } = require('./lib/schema');
const { sleep } = require('./lib/util');
const { clone } = require('mediary');

class Trajectory extends EventEmitter {

    constructor() {
        super();
        this.spinner = ora();
        init(this);
    }

    async execute(definition, input) {
        this.spinner.start();
        const { spec:queue } = await schema.validate(definition);
        for await (const result of this.schedule(queue, input)) {
            this.emit('data', result);
        }
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
            const next = () => {
                name = state.next;
                state = states[state.next];
            };
            let count = 0;
            while (count < MAX_EVENT_COUNT) {
                count++;
                try {
                    switch (state.type) {
                        case 'task':
                            io = await state.fn(await io)
                            yield { name, result: io };
                            if (state.end) return;
                            next();
                            break;
                        case 'pass':
                            if (state.result != null) {
                                io = await state.result;
                            }
                            yield { name, result: io };
                            next();
                            break;
                        case 'wait':
                            if (state.seconds) {
                                await sleep(state.seconds);
                            } else if (state.secondsPath) {
                                await sleep(get(io, state.secondsPath));
                            }
                            yield { name, result: io };
                            next();
                            break;
                        case 'succeed':
                            yield { name, result: io };
                            return;
                        case 'fail':
                            yield { name, result: io };
                            // TODO: surface error event
                            console.error('fail');
                            process.exit(1);
                        case 'parallel':
                            io = await Promise.all(state.branches.map(branch => $this.executeBranch(branch, clone(io))));
                            yield { name, result: io };
                            if (state.end) return;
                            next();
                            break;
                        case 'choice':
                            // TODO
                        default:
                            break;

                    }
                } catch (e) {
                    console.error('bad', e);
                }
            }
        }
        yield* await loop(states, startAt);
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

function iter(emitter) {
    pauseable.resume(emitter);
    return new Promise((resolve, reject) => {
        emitter.once('data', data => {
            pauseable.pause(emitter);
            resolve(data);
        });
        emitter.once('error', error => {
            pauseable.pause(emitter);
            reject(error);
        });
    });
}

function* gen (emitter) {
    while (true) {
        yield iter(emitter);
    }
}

async function init(emitter) {
    for (const data of gen(emitter)) {
        const { name, result } = await data;
        emitter.spinner.succeed(name);
        console.log(result);
    }
}
