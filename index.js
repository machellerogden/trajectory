'use strict';

const { EventEmitter } = require('events');
const JSONPath = require('jsonpath');
const set = require('lodash/set');
const compose = require('lodash/fp/compose');
const clone = require('lodash/cloneDeep');
const serializeError = require('serialize-error');
const ordinal = require('ordinal');
const CancellationContext = require('cancellation-context');

const { stateMachineSchema, optionsSchema, inputSchema } = require('./lib/schema');
const { sleep, reduceAny, isPromise, isReadableStream } = require('./lib/util');
const builtInReporter = require('./lib/reporter');
const { EOL } = require('os');
const streamToPromise = require('stream-to-promise');
const byline = require('byline');

const endStates = new Set([ 'Succeed', 'Fail']);
const isEnd = state => state.End || endStates.has(state.Type);

function createErrorFinder(error) {
    return r => r.ErrorEquals.reduce((acc, v) => acc || v === error.name || v === 'States.ALL', false);
}

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
            reporterOptions = {},
            resources = {}
        } = options;

        super();

        this.resources = resources;

        this.cc = CancellationContext();

        this.reporter = reporter;
        this.reporterOptions = { ...reporterOptions, debug };
        this.depth = 0;

        this.silent = silent;
        if (!silent) this.on('event', this.reportHandler);
    }

    reportHandler({ type, stateType, name, data, message, streamed, closed }) {
        this.reporterOptions;
        this.reporter[type]({
            name,
            data,
            stateType,
            message,
            streamed,
            closed,
            depth: this.depth,
            options: this.reporterOptions
        });
    }

    async execute(stateMachineDefinition, rawInput = {}) {
        const stateMachine = await stateMachineSchema.validate(stateMachineDefinition);
        const input = await inputSchema.validate(rawInput);
        try {
            const results = await this.executeStateMachine(stateMachine, input);

            const data = results.map(({ data }) => data);
            const final = results[results.length - 1];
            this.emit('event', { ...final, type: 'final' });

            this.emit('event', { type: 'complete', name: 'completed', stateType: 'Done', data })

            return [ input, ...data ];
        } catch (e) {
            const { stack } = serializeError(e);
            console.error(stack);
            this.cc.cancelAll();
        }
    }

    async executeStateMachine(stateMachine, input) {
        const results = [];
        const scheduleIterator = this.schedule(stateMachine, clone(input));

        for await (const result of scheduleIterator) {
            await inputSchema.validate(result.data);
            results.push(result);
        }

        return results;
    }

    async* schedule(stateMachine, io) {
        const { StartAt, States } = stateMachine;

        if (States == null || States[StartAt] == null) throw new Error(`Unable to resolve state "${StartAt}".`);

        const context = this;

        const emit = event => this.emit('event', event);

        let name = StartAt;
        let state = States[StartAt];

        const next = () => {
            name = state.Next;
            state = States[state.Next];
        };

        this.getIO = () => clone(io);
        this.getState = () => state;

        const handlers = Handlers(context);

        async function* unsafeAttempt(fn, type) {
            const fnResult = await fn(state, io);
            let data = fnResult;
            let streamed = false;

            if (type !== 'parallel' && (isReadableStream(fnResult.stdout) || isReadableStream(fnResult.stderr))) {
                streamed = true;
                let streamPromises = [];
                if (isReadableStream(fnResult.stdout)) {
                    byline(fnResult.stdout).on('data', line => emit({ type: 'stdout', name, data: line.toString(), stateType: type }));
                    streamPromises.push(streamToPromise(fnResult.stdout));
                } else if (isReadableStream(fnResult.stderr)) {
                    byline(fnResult.stderr).on('data', line => emit({ type: 'stderr', name, data: line.toString(), stateType: type }));
                    streamPromises.push(streamToPromise(fnResult.stderr));
                }
                fnResult.once('exit', (code, signal) => code != 0
                    ? emit({ type: 'stderr', name, closed: true, stateType: type })
                    : emit({ type: 'stdout', name, closed: true, stateType: type }));
                fnResult.once('error', err => emit({ type: 'stderr', name, data: err.message, stateType: type }))
                const [ out = '', err = '' ] = (await Promise.all(streamPromises)).map(s => s.toString().trimRight());
                data = `${out}${out && err ? EOL : ''}${err}`;
            }

            const result = { name, data, stateType: type, streamed };

            yield result;
            emit({ ...result, type: 'info' });
            emit({ ...result, type: 'succeed' });

            io = clone(fnResult);
        }

        async function* handleError(fn, error, type) {
            const message = `"${name}" failed with error "${error.message || JSON.stringify(error)}".`;
            emit({ type: 'info', name, message, stateType: type });
            const findError = createErrorFinder(error);
            const retrier = (state.Retry || []).find(findError);
            const catcher = (state.Catch || []).find(findError);
            if (retrier) {
                try {
                    yield* await retry(retrier, fn, error, type);
                } catch (retryError) {
                    if (catcher) {
                        yield* await catchError(catcher, fn, retryError, type);
                    } else {
                        yield { name, data: retryError };
                        emit({ type: 'error', name, data: retryError, stateType: type });
                        throw retryError;
                    }
                }
            } else if (catcher) {
                yield* await catchError(catcher, fn, error, type);
            } else {
                yield { name, data: error };
                emit({ type: 'error', name, data: error, stateType: type });
                throw error;
            }
        }

        async function* catchError(catcher, fn, error, type) {
            const message = `Catching error in "${name}"`;
            emit({ type: 'info', name, message, stateType: type });
            const errorOutput = catcher.ResultPath != null
                ? set(clone(io), asPath(catcher.ResultPath), { error: error })
                : { error };
            yield { name, data: errorOutput };
            io = clone(errorOutput);
            emit({ type: 'error', name, data: errorOutput, stateType: type });
            delete state.End;
            state.Next = catcher.Next;
        }

        async function* retry(retrier, fn, error, type) {
            let cleared = false;
            let message = `Retrying "${name}" after error`;
            emit({ type: 'info', name, message, stateType: type });
            let {
                IntervalSeconds = 0,
                BackoffRate = 1,
                MaxAttempts = 1
            } = retrier;
            let i = 0;
            while (i++ < MaxAttempts) {
                try {
                    yield* await unsafeAttempt(fn, type);
                    cleared = true;
                    message = `Retry of ${state.Type} state "${name}" succeeded on ${ordinal(i)} attempt.`;
                    emit({ type: 'info', name, message, stateType: type });
                    break;
                } catch (e) {
                    message = `Retry of ${state.Type} state "${name}" failed with error "${e.message}".\nAttempt ${i} of ${MaxAttempts}.`;
                    if (IntervalSeconds > 0 && i < MaxAttempts) message += `\nWill try again in ${IntervalSeconds * BackoffRate} seconds.`;
                    emit({ type: 'info', name, message, stateType: type });
                    if (IntervalSeconds) {
                        await sleep(IntervalSeconds);
                        IntervalSeconds *= BackoffRate;
                    }
                }
            }
            if (!cleared) {
                yield { name, data: error };
                emit({ type: 'error', name, data: error, stateType: type });
                throw error;
            }
        }

        async function* attempt(fn, type) {
            try {
                yield* await unsafeAttempt(fn, type);
            } catch (error) {
                yield* await handleError(fn, error, type);
            }
        }

        while (true) {
            emit({ type: 'start', name, stateType: state.Type });

            yield* state.Type === 'Fail'
                ? abort(name, state, emit)
                : attempt(handlers[state.Type], state.Type);
            if (isEnd(state)) return;

            next();
        }
    }
}

function* abort(name, state, emit) {
    const { Type, Error:error, Cause:cause } = state;
    const data = { name, error, cause };
    const errMsg = [];
    if (error) errMsg.push(error);
    if (cause) errMsg.push(cause);
    yield { name, data };
    emit({ type: Type.toLowerCase(), name, data });
    throw new Error(errMsg.join(': '));
}

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
        async Task(state, io) {
            const fn = typeof state.Resource === 'function'
                ? state.Resource
                : context.resources[state.Resource];
            const cancellableFn = state.TimeoutSeconds == null
                ? io => context.cc.Cancellable(onCancel => fn(io, { Resource: state.Resource, onCancel }))
                : io => context.cc.Perishable(onCancel => fn(io, { Resource: state.Resource, onCancel }), state.TimeoutSeconds * 1000);
            return compose(processOutput, cancellableFn, processInput)(io);
        },
        async Pass(state, io) {
            return processIO(io);
        },
        async Wait(state, io) {
            return compose(fromOutput, delayOutput, fromInput)(io);
        },
        async Parallel(state, io) {
            context.depth++;
            const input = fromInput(io);
            const output = await Promise.all(state.Branches.map(async branch => {
                const branchResult = await context.executeStateMachine(branch, input);
                return branchResult.map(({ data }) => data);
            }));
            context.depth--;
            return processOutput(output);
        },
        async Choice(state, io) {
            const choice = findChoice(state.Choices, io);
            const Next = choice == null
                ? state.Default
                : choice.Next;
            if (Next == null) throw new Error(`no where to go`);
            delete state.End;
            state.Next = Next;
            return compose(fromOutput, fromInput)(io);
        },
        async Succeed(state, io) {
            return compose(fromOutput, fromInput)(io);
        }
    };
}

function IOCtrl({ getState, getIO, cc }) {

    function applyParameters(data) {
        const state = getState();
        if (state.Parameters == null) return data;
        const recur = value =>
            reduceAny(value, (result, v, k) =>
                applyDataToParameters(data, result, k, v, recur));
        return recur(state.Parameters);
    }

    function fromInput(data) {
        const state = getState();
        if (state.InputPath == null) return data;
        return JSONPath.query(data, state.InputPath).shift();
    }

    async function fromOutput(data) {
        const state = getState();
        if (state.OutputPath == null) return data;
        return JSONPath.query(await data, state.OutputPath).shift();
    }

    async function toResult(value) {
        const state = getState();
        if (state.Result) return state.Result;
        const v = await value;
        if (state.ResultPath == null || state.ResultPath === '$') return v;
        return set(getIO(), asPath(state.ResultPath), v);
    }

    async function delayOutput(data) {
        const state = getState();
        const seconds = (state.Seconds != null)
            ? state.Seconds
            : (state.SecondsPath != null)
                ? JSONPath.query(data, state.SecondsPath)
                : null;
        if (typeof seconds !== 'number') {
            const msg = `SecondsPath on state "${name}" resolves to "${seconds}". Must be a number.`; 
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

function applyDataToParameters(data, result = {}, key, value, recur) {
    if (key.endsWith('.$')) {
        result[key.slice(0, -2)] = value === '$'
            ? data
            : value.includes('$')
                ? JSONPath.query(data, value).shift()
                : value;
    } else {
        result[key] = value != null && typeof value === 'object'
            ? recur(value)
            : value;
    }
    return result;
}

function findChoice(choices = [], io) {
    return choices.find(choice => applyRule(choice, io));
}

const ruleOperations = {
    BooleanEquals: (a, b) => a === b,
    NumericEquals: (a, b) => a === b,
    NumericGreaterThan: (a, b) => a > b,
    NumericGreaterThanEquals: (a, b) => a >= b,
    NumericLessThan: (a, b) => a < b,
    NumericLessThanEquals: (a, b) => a <= b,
    StringEquals: (a, b) => a === b,
    StringGreaterThan: (a, b) => a.localeCompare(b) > 0,
    StringGreaterThanEquals: (a, b) => a.localeCompare(b) >= 0,
    StringLessThan: (a, b) => a.localeCompare(b) < 0,
    StringLessThanEquals: (a, b) => a.localeCompare(b) <= 0,
    TimestampEquals: (a, b) => (new Date(a)).getTime() === (new Date(b)).getTime(),
    TimestampGreaterThan: (a, b) => new Date(a) > new Date(b),
    TimestampGreaterThanEquals: (a, b) => new Date(a) >= new Date(b),
    TimestampLessThan: (a, b) => new Date(a) < new Date(b),
    TimestampLessThanEquals: (a, b) => new Date(a) <= new Date(b),
    And: a => a.every(v => v === true),
    Or: a => a.some(v => v === true),
    Not: a => !a
};

function applyRule(r, io) {
    let { Next, ...rule } = r;
    if (rule.Variable) {
        return applyComparison(rule, io);
    } else {
        const withAppliedComparisons = Object.entries(rule)
            .reduce((acc, [ key, value ]) =>
                Array.isArray(value)
                    ? value.map(v => applyRule(v, io))
                    : applyRule(value, io),
                null);
        const operation = Object.keys(rule).shift();
        return ruleOperations[operation](withAppliedComparisons);
    }
}

function applyComparison(rule, io) {
    const { Variable, ...rest } = rule;
    const value = JSONPath.query(io, Variable).shift();
    const operation = Object.keys(rest).shift();
    const comparisonValue = rest[operation];
    return ruleOperations[operation](value, comparisonValue);
}

function asPath(referencePath) {
    const {
        groups: {
            path = referencePath
        } = {}
    } = referencePath.match(/^\$[\.]?(?<path>.*)/) || {};
    return path;
}

module.exports = { Trajectory };
