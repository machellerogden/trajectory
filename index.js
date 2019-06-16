'use strict';

const { EventEmitter } = require('events');
const get = require('lodash/get');
const { clone } = require('mediary');

const { schema } = require('./lib/schema');
const { sleep } = require('./lib/util');
const { isTerminal } = require('./lib/helpers');
const { defaultReporter, defaultReporterOptions } = require('./lib/defaults');

class Trajectory extends EventEmitter {

    constructor({
        debug = false,
        reporter = defaultReporter,
        reporterOptions = defaultReporterOptions
    } = {}) {
        super();
        this.reporter = reporter;
        this.indent = reporterOptions.indent || defaultReporterOptions.indent;
        this.indentCols = reporterOptions.indentCols || defaultReporterOptions.indentCols;
        this.on('event', ({ messageType, name, data }) => {
            this.reporter[messageType]({ name, data, indent: this.indent });
        });
    }

    async execute(definition, input) {
        const { spec:queue } = await schema.validate(definition);
        const results = [];
        try {
            for await (const result of this.schedule(queue, input)) {
                results.push(result);
            }
        } catch (e) {
            console.log('boom');
        }
        return results;
    }

    async * schedule(queue, io) {
        const { startAt, states } = queue;
        const $this = this;

        async function* loop(state, start) {
            let name; 

            if (state == null || state[start] == null) throw new Error(`Unable to resolve state "${start}".`);

            if (start) {
                name = start;
                state = state[start];
            }

            function next() {
                name = state.next;
                state = states[state.next];
            }

            function emit(messageType, data) {
                $this.emit('event', { messageType, name, data });
            }

            function * output(data) {
                yield { name, data };
            }

            const handlers = {
                task: async function * taskHandler() {
                        io = await state.fn(await io)
                        yield* output(io);
                        emit('succeed', io);
                },
                pass: async function * passHandler() {
                        if (state.result != null) {
                            io = await state.result;
                        }
                        yield* output(io);
                        emit('succeed', io);
                },
                wait: async function * waitHandler() {
                        if (state.seconds) {
                            await sleep(state.seconds);
                        } else if (state.secondsPath) {
                            await sleep(get(io, state.secondsPath));
                        }
                        yield* output(io);
                        emit('succeed', io);
                },
                succeed: async function * succeedHandler() {
                        yield* output(io);
                        emit('succeed', io);
                },
                fail: async function * failHandler() {
                        const err = { name, io };
                        if (state.error) err.error = state.error;
                        if (state.cause) err.cause = state.cause;
                        yield* output(err);
                        emit('fail', err);
                },
                parallel: async function * parallelHandler() {
                        $this.indent += $this.indentCols;
                        io = await Promise.all(state.branches.map(branch => $this.executeBranch(branch, clone(io))));
                        $this.indent -= $this.indentCols;
                        yield* output(io);
                        emit('succeed', io);
                },
                choice: async function * choiceHandler() {
                    // TODO
                }
            };

            while (true) {
                emit('start');
                yield* handlers[state.type]();
                if (isTerminal(state)) return;
                next();
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
