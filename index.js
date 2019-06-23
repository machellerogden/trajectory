'use strict';

const { EventEmitter } = require('events');
const JSONPath = require('jsonpath');
const set = require('lodash/set');
const compose = require('lodash/fp/compose');
const { clone } = require('mediary');
const serializeError = require('serialize-error');
const ordinal = require('ordinal');

const { definitionSchema, optionsSchema, inputSchema } = require('./lib/schema');
const { sleep, reduceAny } = require('./lib/util');
const { isEnd, applyDataToParameters } = require('./lib/helpers');

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
            silent = false,
            reporter = builtInReporter,
            reporterOptions = {}
        } = options;

        super();

        this.silent = silent;
        this.reporter = reporter;
        this.depth = 0;
        this.reporterOptions = reporterOptions;

        if (!silent) this.on('event', this.reportHandler);
    }

    reportHandler({ type, name, data, message }) {
        this.reporter[type]({
            name,
            data,
            message,
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
        const scheduleIterator = this.schedule(queue, clone(input));
        for await (const result of scheduleIterator) {
            results.push(result.data);
        }
        return results;
    }

    async* schedule(queue, io) {
        const { startAt, states } = queue;

        if (states == null || states[startAt] == null) {
            throw new Error(`Unable to resolve state "${startAt}".`);
        }

        const context = this;

        const emit = event => this.emit('event', event);

        let name = startAt;
        let state = states[startAt];

        const next = () => {
            name = state.next;
            state = states[state.next];
        };

        this.getIO = () => clone(io);
        this.setIO = v => io = clone(v);
        this.getState = () => state;

        const handlers = Handlers(context);

        async function* unsafeAttempt(fn) {
            const output = await fn(state, io);
            yield { name, data: output };
            emit({ type: 'succeed', name, data: output });
            context.setIO(output); // set data for next loop
        }

        async function* retry(fn, error) {
            let cleared = false;
            if (state.retry) {
                emit({
                    type: 'info',
                    name,
                    message: `"${name}" failed with error "${error.message}". Will retry.`
                });
                const retrier = state.retry.find(r => r.errorEquals.includes(error.name));
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
                            let message = `Retry of ${state.type} state "${name}" succeeded on ${ordinal(i)} attempt.`;
                            emit({
                                type: 'info',
                                name,
                                message
                            });
                            break;
                        } catch (e) {
                            let message = `Retry of ${state.type} state "${name}" failed with error "${e.message}".\nAttempt ${i} of ${maxAttempts}.`;
                            if (intervalSeconds > 0 && i < maxAttempts) message += `\nWill try again in ${intervalSeconds * backoffRate} seconds.`;
                            emit({
                                type: 'info',
                                name,
                                message
                            });
                            if (intervalSeconds) {
                                await sleep(intervalSeconds);
                                intervalSeconds *= backoffRate;
                            }
                        }
                    }
                }
            }
            if (!cleared) {
                yield { name, data: error };
                emit({ type: 'error', name, data: error });
                throw error;
            }
        }

        async function* attempt(fn) {
            if (state.type === 'fail') return yield* await fn(state, io);
            try {
                yield* await unsafeAttempt(fn);
            } catch (error) {
                yield* await retry(fn, error);
            }
        }

        while (true) {
            emit({ type: 'start', name });

            if (state.type === 'fail') {
                yield* abort(name, state, emit);
            } else {
                yield* attempt(handlers[state.type]);
                if (isEnd(state)) return;
            }

            next();
        }
    }
}

function* abort(name, state, emit) {
    const { type, error, cause } = state;
    const data = { name, error, cause };
    const errMsg = [];
    if (error) errMsg.push(error);
    if (cause) errMsg.push(cause);
    yield { name, data };
    emit({ type, name, data });
    throw new Error(errMsg.join(': '));
}

module.exports = { Trajectory };

function Handlers(context) {

    const {
        applyParameters,
        fromInput,
        fromOutput,
        toResult,
        delayOutput,
        processInput,
        processOutput,
        processIO
    } = IOCtrl(context);

    return {
        async task(state, io) {
            // TODO:
            //   * catch
            //   * timeoutSeconds
            return compose(processOutput, state.fn, processInput)(io);
        },
        async pass(state, io) {
            return processIO(io);
        },
        async wait(state, io) {
            return compose(fromOutput, delayOutput, fromInput)(io);
        },
        async parallel(state, io) {
            context.depth++;
            const input = fromInput(io);
            const output = await Promise.all(state.branches.map(branch => context.executeQueue(branch, input)));
            context.depth--;
            return processOutput(output);
        },
        async choice(state, io) {
            // TODO
        },
        async succeed(state, io) {
            return compose(fromOutput, fromInput)(io);
        }
    };
}

function IOCtrl({ getState, getIO }) {

    function applyParameters(data) {
        const state = getState();
        if (state.parameters == null) return data;
        const recur = value =>
            reduceAny(value, (result, v, k) =>
                applyDataToParameters(data, result, k, v, recur));
        return recur(state.parameters);
    }

    function fromInput(data) {
        const state = getState();
        if (state.inputPath == null) return data;
        return JSONPath.query(data, state.inputPath).shift();
    }

    async function fromOutput(data) {
        const state = getState();
        if (state.outputPath == null) return data;
        return JSONPath.query(await data, state.outputPath).shift();
    }

    async function toResult(value) {
        const state = getState();
        if (state.result) return state.result;
        if (state.resultPath == null) return await value;
        return set(getIO(), state.resultPath, await value);
    }

    async function delayOutput(data) {
        const state = getState();
        if (state.seconds != null) {
            await sleep(state.seconds);
        } else if (state.secondsPath != null) {
            const seconds = JSONPath.query(data, state.secondsPath);
            if (typeof seconds !== 'number') {
                const msg = `secondsPath on state "${name}" resolves to "${seconds}". Must be a number.`; 
                throw new Error(msg);
            }
            await sleep(seconds);
        }
        return data;
    }

    const processInput = compose(applyParameters, fromInput);
    const processOutput = compose(fromOutput, toResult);
    const processIO = compose(processOutput, processInput)

    return {
        applyParameters,
        fromInput,
        fromOutput,
        toResult,
        delayOutput,
        processInput,
        processOutput,
        processIO
    };
}

