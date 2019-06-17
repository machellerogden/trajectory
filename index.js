'use strict';

const { EventEmitter } = require('events');
const get = require('lodash/get');
const { clone } = require('mediary');
const serializeError = require('serialize-error');

const { definitionSchema, optionsSchema } = require('./lib/schema');
const { sleep } = require('./lib/util');
const { isEnd } = require('./lib/helpers');

const builtInReporter = require('./lib/reporter');

class Trajectory extends EventEmitter {

    constructor(opts = {}) {
        const {
            error:optionsError,
            value:options
        } = optionsSchema.validate(opts);

        if (optionsError) throw new Error(optionsError);

        const {
            debug = false,
            report = true,
            reporter = builtInReporter,
            reporterOptions: {
                indent = 0,
                indentCols = 2,
            } = {}
        } = options;

        super();

        this.report = report;
        this.reporter = reporter;
        this.indent = indent;
        this.indentCols = indentCols;

        this.on('event', this.eventHandler);
    }

    eventHandler({ type, name, data }) {
        this.report && this.reporter[type]({ name, data, indent: this.indent });
    }

    async execute(definition, input) {
        const { spec:queue } = await definitionSchema.validate(definition);
        let results;
        try {
            results = await this.executeQueue(queue, input);
            this.emit('event', { type: 'complete', name: 'completed', data: results })
        } catch (e) {
            const { stack } = serializeError(e);
            console.error(stack);
            process.exit(2);
        }
        return [ input, ...results ];
    }

    async executeQueue(queue, input) {
        const results = [];
        for await (const result of this.schedule(queue, input)) results.push(result.data);
        return results;
    }

    async * schedule(queue, io) {
        const { startAt, states } = queue;
        const $this = this;

        async function* loop(state, start) {
            io = clone(io);
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

            function * output(type, data) {
                yield { name, data };
                $this.emit('event', { type, name, data });
            }

            const handlers = {
                task: async function * taskHandler() {
                        io = await state.fn(await io)
                        yield* output('succeed', io);
                },
                pass: async function * passHandler() {
                        if (state.result != null) {
                            io = await state.result;
                        }
                        yield* output('succeed', io);
                },
                wait: async function * waitHandler() {
                        if (state.seconds) {
                            await sleep(state.seconds);
                        } else if (state.secondsPath) {
                            await sleep(get(io, state.secondsPath));
                        }
                        yield* output('succeed', io);
                },
                succeed: async function * succeedHandler() {
                        yield* output('succeed', io);
                },
                fail: async function * failHandler() {
                        const err = { name, io };
                        const errMsg = [];
                        if (state.error) {
                            err.error = state.error;
                            errMsg.push(err.error);
                        }
                        if (state.cause) {
                            err.cause = state.cause;
                            errMsg.push(err.cause);
                        }
                        yield* output('fail', err);
                        throw new Error(errMsg.join(': '));
                },
                parallel: async function * parallelHandler() {
                        $this.indent += $this.indentCols;
                        io = await Promise.all(state.branches.map(branch => $this.executeQueue(branch, io)));
                        $this.indent -= $this.indentCols;
                        yield* output('succeed', io);
                },
                choice: async function * choiceHandler() {
                    // TODO
                }
            };

            while (true) {
                $this.emit('event', { type: 'start', name });
                yield* handlers[state.type]();
                if (isEnd(state)) return;
                next();
            }
        }

        yield * await loop(states, startAt);
    }
}

module.exports = { Trajectory };
