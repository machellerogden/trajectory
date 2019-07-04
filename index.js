'use strict';

const { EventEmitter } = require('events');
const JSONPath = require('jsonpath');
const set = require('lodash/set');
const compose = require('lodash/fp/compose');
const { clone } = require('mediary');
const serializeError = require('serialize-error');
const ordinal = require('ordinal');

const CancellationContext = require('cancellation-context');

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

        this.cc = CancellationContext();

        this.reporter = reporter;
        this.depth = 0;
        this.reporterOptions = reporterOptions;

        this.silent = silent;
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
            return [ input, ...results ];
        } catch (e) {
            const { stack } = serializeError(e);
            console.error(stack);
            this.cc.cancelAll();
        }
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

        async function* handleError(fn, error) {
            emit({
                type: 'info',
                name,
                message: `"${name}" failed with error "${error.message || JSON.stringify(error)}".`
            });
            const retrier = (state.retry || []).find(r => r.errorEquals.includes(error.name));
            const catcher = (state.catch || []).find(c => c.errorEquals.includes(error.name));
            if (retrier) {
                try {
                    yield* await retry(retrier, fn, error);
                } catch (retryError) {
                    if (catcher) {
                        yield* await catchError(catcher, fn, retryError);
                    } else {
                        throw retryError;
                    }
                }
            } else if (catcher) {
                yield* await catchError(catcher, fn, error);
            } else {
                yield { name, data: error };
                emit({ type: 'error', name, data: error });
                throw error;
            }
        }

        async function* catchError(catcher, fn, error) {
            emit({
                type: 'info',
                name,
                message: `Catching error in "${name}"`
            });
            const errorOutput = { error: error };
            yield catcher.resultPath != null
                ? set(context.getIO(), catcher.resultPath, errorOutput)
                : errorOutput;
            delete state.end;
            state.next = catcher.next;
        }

        async function* retry(retrier, fn, error) {
            let cleared = false;
            emit({
                type: 'info',
                name,
                message: `Retrying "${name}" after error`
            });
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
                yield* await handleError(fn, error);
            }
        }

        while (true) {
            emit({ type: 'start', name });

            yield* state.type === 'fail'
                ? abort(name, state, emit)
                : attempt(handlers[state.type]);
            if (isEnd(state)) return;

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
            const cancellableFn = state.timeoutSeconds == null
                ? io => context.cc.Cancellable(onCancel => state.fn(io, onCancel))
                : io => context.cc.Perishable(onCancel => state.fn(io, onCancel), state.timeoutSeconds * 1000);
            return compose(processOutput, cancellableFn, processInput)(io);
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

function IOCtrl({ getState, getIO, cc }) {

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
        const seconds = (state.seconds != null)
            ? state.seconds
            : (state.secondsPath != null)
                ? JSONPath.query(data, state.secondsPath)
                : null;
        if (typeof seconds !== 'number') {
            const msg = `secondsPath on state "${name}" resolves to "${seconds}". Must be a number.`; 
            throw new Error(msg);
        }
        await cc.CancellableTimeout(seconds * 1000);
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

