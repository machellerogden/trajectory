'use strict';

const { EventEmitter } = require('events');
const JSONPath = require('jsonpath');
const set = require('lodash/set');
const compose = require('lodash/fp/compose');
const { clone } = require('mediary');
const serializeError = require('serialize-error');
const ordinal = require('ordinal');

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
            reporterOptions = {}
        } = options;

        super();

        this.report = report;
        this.reporter = reporter;
        this.depth = 0;
        this.reporterOptions = reporterOptions;

        if (report) this.on('event', this.reportHandler);
    }

    reportHandler({ type, name, data, msg }) {
        this.report && this.reporter[type]({
            name,
            data,
            msg,
            depth: this.depth,
            options: this.reporterOptions
        });
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
                    ? value.reduce((result, v, i) =>
                        applyDataToParameters(data, result, i, v, recur),
                        [])
                    : Object.entries(value).reduce((result, [ k, v ]) =>
                        applyDataToParameters(data, result, k, v, recur),
                        {});
            }
            return recur(state.parameters);
        }

        function fromInput(data) {
            if (state.inputPath == null) return data;
            return JSONPath.query(data, state.inputPath).shift();
        }

        async function fromOutput(data) {
            if (state.outputPath == null) return data;
            return JSONPath.query(await data, state.outputPath).shift();
        }

        async function toResult(value) {
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

        const processInput = compose(applyParameters, fromInput);
        const processOutput = compose(fromOutput, toResult);
        const processIO = compose(processOutput, processInput)

        async function * unsafeAttempt(fn) {
            const output = await fn();
            yield { name, data: output };
            $this.emit('event', { type: 'succeed', name, data: output });
            io = clone(output); // set data for next loop
        }

        // TODO: factor out procedural nonsense as much as is reasonable
        async function * attempt(fn) {
            try {
                yield* await unsafeAttempt(fn);
            } catch (err) {
                let cleared = false;
                if (state.retry) {
                    $this.emit('event', {
                        type: 'info',
                        name,
                        msg: `"${name}" failed with error "${err.message}". Will retry.`
                    });
                    const retrier = state.retry.find(r => r.errorEquals.includes(err.name));
                    if (retrier != null) {
                        let {
                            intervalSeconds = 0,
                            backoffRate = 1,
                            maxAttempts = 1
                        } = retrier;
                        let i = 0;
                        while (i++ < maxAttempts) {
                            try {
                                yield* await unsafeAttempt(fn);
                                cleared = true;
                                let msg = `Retry of ${state.type} state "${name}" succeeded on ${ordinal(i)} attempt.`;
                                $this.emit('event', {
                                    type: 'info',
                                    name,
                                    msg
                                });
                                break;
                            } catch (e) {
                                let msg = `Retry of ${state.type} state "${name}" failed with error "${e.message}".\nAttempt ${i} of ${maxAttempts}.`;
                                if (intervalSeconds > 0 && i < maxAttempts) msg += `\nWill try again in ${intervalSeconds * backoffRate} seconds.`;
                                $this.emit('event', {
                                    type: 'info',
                                    name,
                                    msg
                                });
                            }
                            if (intervalSeconds) {
                                await sleep(intervalSeconds);
                                intervalSeconds *= backoffRate;
                            }
                        }
                    }
                }
                if (!cleared) {
                    yield { name, data: err };
                    $this.emit('event', { type: 'error', name, data: err });
                    throw err;
                }
            }
        }

        const handlers = {
            async * task() {
                // TODO:
                //   * retry
                //   * catch
                //   * timeoutSeconds
                yield* attempt(() =>
                    compose(processOutput, state.fn, processInput)(io));
            },
            async * pass() {
                yield* attempt(() =>
                    processIO(io));
            },
            async * wait() {
                yield* attempt(() =>
                    compose(fromOutput, delay, fromInput)(io));
            },
            async * parallel() {
                yield* attempt(async () => {
                    $this.depth++;
                    const input = fromInput(io);
                    const output = await Promise.all(state.branches.map(branch => $this.executeQueue(branch, input)));
                    $this.depth--;
                    return processOutput(output);
                });
            },
            async * choice() {
                // TODO
            },
            async * succeed() {
                yield* attempt(() =>
                    compose(fromOutput, fromInput)(io));
            },
            async * fail() {
                const err = {
                    name,
                    error: state.error,
                    cause: state.cause
                };
                const errMsg = [];
                if (state.error) errMsg.push(err.error);
                if (state.cause) errMsg.push(err.cause);
                $this.emit('event', {
                    type: 'fail',
                    name,
                    data: err
                });
                yield { name, data: err };
                throw new Error(errMsg.join(': '));
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

function applyDataToParameters(data, result = {}, key, value, recur) {
    if (key.endsWith('.$')) {
        result[key.slice(0, -2)] = JSONPath.query(data, value).shift();
    } else {
        result[key] = recur(value[key]);
    }
    return result;
}
