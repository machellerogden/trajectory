'use strict';

const { EventEmitter } = require('events');
const JSONPath = require('jsonpath');
const set = require('lodash/set');
const compose = require('lodash/fp/compose');
//const clone = require('lodash/cloneDeep');
const { clone } = require('mediary');
const serializeError = require('serialize-error');

const { definitionSchema, optionsSchema, inputSchema } = require('./lib/schema');
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
                indent = 0
            } = {}
        } = options;

        super();

        this.report = report;
        this.reporter = reporter;
        this.depth = 0;
        this.indent = indent;

        this.on('event', this.eventHandler);
    }

    eventHandler({ type, name, data }) {
        this.report && this.reporter[type]({ name, data, depth: this.depth, cols: this.indent });
    }

    async execute(definition, rawInput = {}) {
        const { spec:queue } = await definitionSchema.validate(definition);
        const input = await inputSchema.validate(rawInput);
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
        for await (const result of this.schedule(queue, clone(input))) results.push(result.data);
        return results;
    }

    async * schedule(queue, io) {
        const { startAt, states } = queue;
        const $this = this;

        if (states == null || states[startAt] == null) throw new Error(`Unable to resolve state "${startAt}".`);

        let name = startAt;
        let state = states[startAt];

        function next() {
            name = state.next;
            state = states[state.next];
        }

        function applyParameters(data) {
            if (state.parameters == null) return data;
            function recur(value) {
                if (value == null || typeof value !== 'object') return value;
                return Array.isArray(value)
                    ? value.reduce((acc, v, i) => applyP(data, acc, i, v, recur), [])
                    : Object.entries(value).reduce((acc, [ k, v ]) => applyP(data, acc, k, v, recur), {});
            }
            return recur(state.parameters);
        }

        function getInput(data) {
            if (state.inputPath == null) return data;
            return JSONPath.query(data, state.inputPath).shift();
        }

        async function getOutput(data) {
            if (state.outputPath == null) return data;
            return JSONPath.query(await data, state.outputPath).shift();
        }

        async function setResult(value) {
            if (state.result) return state.result;
            if (state.resultPath == null) return await value;
            return set(clone(io), state.resultPath, await value);
        }

        async function delay(data) {
            if (state.seconds != null) {
                await sleep(state.seconds);
            } else if (state.secondsPath != null) {
                const seconds = JSONPath.query(data, state.secondsPath);
                if (typeof seconds !== 'number') throw new Error(`secondsPath on state "${name}" resolves to "${seconds}". Must be a number.`);
                await sleep(seconds);
            }
            return data;
        }

        async function * output(type, o) {
            const data = await o;
            yield { name, data };
            $this.emit('event', { type, name, data });
            io = clone(data); // set data for next loop
        }

        const handlers = {
            async * task() {
                const processIO = compose(getOutput, setResult, state.fn, applyParameters, getInput);
                yield* await output('succeed', processIO(io));
            },
            async * pass() {
                const processIO = compose(getOutput, setResult, applyParameters, getInput);
                yield* await output('succeed', processIO(io));
            },
            async * wait() {
                const processIO = compose(getOutput, delay, getInput);
                yield* output('succeed', await processIO(io));
            },
            async * succeed() {
                const processIO = compose(getOutput, getInput);
                yield* output('succeed', processIO(io));
            },
            async * fail() {
                const processIO = compose(getOutput, getInput);
                const out = processIO(io);
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
            async * parallel() {
                $this.depth++;
                const input = getInput(io);
                const out = await Promise.all(state.branches.map(branch => $this.executeQueue(branch, input)));
                const processOutput = compose(getOutput, setResult);
                $this.depth--;
                yield* output('succeed', processOutput(out));
            },
            async * choice() {
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
}

module.exports = { Trajectory };

function applyP(d, a, k, v, fn) {
    if (k.endsWith('.$')) {
        a[k.slice(0, -2)] = JSONPath.query(d, v).shift();
    } else {
        a[k] = fn(v[k]);
    }
    return a;
}
