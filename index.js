'use strict';

const { EventEmitter } = require('events');
const JSONPath = require('jsonpath');
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
            io = clone(await io);
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
                        let out = await state.fn(io)
                        io = out;
                        yield* output('succeed', io);
                },
                pass: async function * passHandler() {
                        let out = io;
                        if (state.inputPath != null) {
                            out = JSONPath.query(out, state.outputPath);
                        }
                        if (state.result != null) {
                            out = await state.result;
                        }
                        if (state.outputPath != null) {
                            out = JSONPath.query(out, state.outputPath);
                        }
                        io = out;
                        yield* output('succeed', io);
                },
                wait: async function * waitHandler() {
                        let out = io;
                        if (state.seconds != null) {
                            await sleep(state.seconds);
                        } else if (state.secondsPath != null) {
                            const seconds = JSONPath.query(out, state.secondsPath);
                            await sleep(seconds);
                        }
                        yield* output('succeed', out);
                },
                succeed: async function * succeedHandler() {
                        let out = io;
                        yield* output('succeed', out);
                },
                fail: async function * failHandler() {
                        let out = io;
                        const err = { name, out };
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
                        $this.indent -= $this.indentCols;
                        let out = await Promise.all(state.branches.map(branch => $this.executeQueue(branch, io)));
                        io = out;
                        yield* output('succeed', out);
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
