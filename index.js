'use strict';

const { EventEmitter } = require('events');
const JSONPath = require('jsonpath');
const set = require('lodash/set');
const compose = require('lodash/fp/compose');
const { clone } = require('mediary');
const serializeError = require('serialize-error');
const ordinal = require('ordinal');
const CancellationContext = require('cancellation-context');
const { stateMachineSchema, optionsSchema, inputSchema } = require('./lib/schema');
const { sleep, reduceAny } = require('./lib/util');
const builtInReporter = require('./lib/reporter');

const endStates = new Set([ 'Succeed', 'Fail']);
const isEnd = state => state.End || endStates.has(state.Type);

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
        this.depth = 0;
        this.reporterOptions = reporterOptions;

        this.silent = silent;
        if (!silent) this.on('event', this.reportHandler);
    }

    reportHandler({ type, name, data, message }) {
        this.reporter[type.toLowerCase()]({
            name,
            data,
            message,
            depth: this.depth,
            options: this.reporterOptions
        });
    }

    async execute(stateMachineDefinition, rawInput = {}) {
        const stateMachine = await stateMachineSchema.validate(stateMachineDefinition);
        const input = await inputSchema.validate(rawInput);
        let results;
        try {
            results = await this.executeStateMachine(stateMachine, input);
            this.emit('event', { type: 'Complete', name: 'completed', data: results })
            return [ input, ...results ];
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
            results.push(result.data);
        }
        return results;
    }

    async* schedule(stateMachine, io) {
        const { StartAt, States } = stateMachine;

        if (States == null || States[StartAt] == null) {
            throw new Error(`Unable to resolve state "${StartAt}".`);
        }

        const context = this;

        const emit = event => this.emit('event', event);

        let name = StartAt;
        let state = States[StartAt];

        const next = () => {
            name = state.Next;
            state = States[state.Next];
        };

        this.getIO = () => clone(io);
        this.setIO = v => io = clone(v);
        this.getState = () => state;

        const handlers = Handlers(context);

        async function* unsafeAttempt(fn) {
            const output = await fn(state, io);
            yield { name, data: output };
            emit({ type: 'Succeed', name, data: output });
            context.setIO(output); // set data for next loop
        }

        async function* handleError(fn, error) {
            emit({
                type: 'Info',
                name,
                message: `"${name}" failed with error "${error.message || JSON.stringify(error)}".`
            });
            const retrier = (state.Retry || []).find(r => r.ErrorEquals.includes(error.name));
            const catcher = (state.Catch || []).find(c => c.ErrorEquals.includes(error.name));
            if (retrier) {
                try {
                    yield* await retry(retrier, fn, error);
                } catch (retryError) {
                    if (catcher) {
                        yield* await catchError(catcher, fn, retryError);
                    } else {
                        yield { name, data: retryError };
                        emit({ type: 'Error', name, data: retryError });
                        throw retryError;
                    }
                }
            } else if (catcher) {
                yield* await catchError(catcher, fn, error);
            } else {
                yield { name, data: error };
                emit({ type: 'Error', name, data: error });
                throw error;
            }
        }

        async function* catchError(catcher, fn, error) {
            emit({
                type: 'Info',
                name,
                message: `Catching error in "${name}"`
            });
            const errorOutput = catcher.ResultPath != null
                ? set(context.getIO(), catcher.ResultPath, { error: error })
                : { error };
            yield { name, data: errorOutput };
            context.setIO(errorOutput);
            emit({ type: 'Error', name, data: errorOutput });
            delete state.End;
            state.Next = catcher.Next;
        }

        async function* retry(retrier, fn, error) {
            let cleared = false;
            emit({
                type: 'Info',
                name,
                message: `Retrying "${name}" after error`
            });
            let {
                IntervalSeconds = 0,
                BackoffRate = 1,
                MaxAttempts = 1
            } = retrier;
            let i = 0;
            while (i++ < MaxAttempts) {
                try {
                    yield* await unsafeAttempt(fn);
                    cleared = true;
                    let message = `Retry of ${state.Type} state "${name}" succeeded on ${ordinal(i)} attempt.`;
                    emit({
                        type: 'Info',
                        name,
                        message
                    });
                    break;
                } catch (e) {
                    let message = `Retry of ${state.Type} state "${name}" failed with error "${e.message}".\nAttempt ${i} of ${MaxAttempts}.`;
                    if (IntervalSeconds > 0 && i < MaxAttempts) message += `\nWill try again in ${IntervalSeconds * BackoffRate} seconds.`;
                    emit({
                        type: 'Info',
                        name,
                        message
                    });
                    if (IntervalSeconds) {
                        await sleep(IntervalSeconds);
                        IntervalSeconds *= BackoffRate;
                    }
                }
            }
            if (!cleared) {
                yield { name, data: error };
                emit({ type: 'Error', name, data: error });
                throw error;
            }
        }

        async function* attempt(fn) {
            try {
                yield* await unsafeAttempt(fn);
            } catch (error) {
                yield* await handleError(fn, error);
            }
        }

        while (true) {
            emit({ type: 'Start', name });

            yield* state.Type === 'Fail'
                ? abort(name, state, emit)
                : attempt(handlers[state.Type]);
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
    emit({ type, name, data });
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
                ? io => context.cc.Cancellable(onCancel => fn(io, onCancel))
                : io => context.cc.Perishable(onCancel => fn(io, onCancel), state.TimeoutSeconds * 1000);
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
            const output = await Promise.all(state.Branches.map(branch => context.executeStateMachine(branch, input)));
            context.depth--;
            return processOutput(output);
        },
        async Choice(state, io) {
            const choice = findChoice(state.Choices, io);
            // choice.Next
        },
        async Succeed(state, io) {
            return compose(fromOutput, fromInput)(io);
        }
    };
}

function findChoice(choices = [], io) {
    return choices.find(choice => {
                //if (c.And) {
                //} else if (c.Or) {
                //} else if (c.Not) {
                //}
                //BooleanEquals
                //NumericEquals
                //NumericGreaterThan
                //NumericGreaterThanEquals
                //NumericLessThan
                //NumericLessThanEquals
                //StringEquals
                //StringGreaterThan
                //StringGreaterThanEquals
                //StringLessThan
                //StringLessThanEquals
                //TimestampEquals
                //TimestampGreaterThan
                //TimestampGreaterThanEquals
                //TimestampLessThan
                //TimestampLessThanEquals
            //});
    });
}

// TODO: move type checks to joi schema
const ruleOperations = {
    BooleanEquals: (a, b) => [ a, b ].every(v => typeof v === 'boolean') && a === b,
    NumericEquals: (a, b) => [ a, b ].every(v => typeof v === 'number') && a === b,
    NumericGreaterThan: (a, b) => [ a, b ].every(v => typeof v === 'number') && a > b,
    NumericGreaterThanEquals: (a, b) => [ a, b ].every(v => typeof v === 'number') && a >= b,
    NumericLessThan: (a, b) => [ a, b ].every(v => typeof v === 'number') && a < b,
    NumericLessThanEquals: (a, b) => [ a, b ].every(v => typeof v === 'number') && a <= b,
    StringEquals: (a, b) => [ a, b ].every(v => typeof v === 'string') && a === b,
    StringGreaterThan: (a, b) => [ a, b ].every(v => typeof v === 'string') && a.localeCompare(b) > 0,
    StringGreaterThanEquals: (a, b) => [ a, b ].every(v => typeof v === 'string') && a.localeCompare(b) >= 0,
    StringLessThan: (a, b) => [ a, b ].every(v => typeof v === 'string') && a.localeCompare(b) < 0,
    StringLessThanEquals: (a, b) => [ a, b ].every(v => typeof v === 'string') && a.localeCompare(b) <= 0,
    TimestampEquals: (a, b) => (new Date(a)).getTime() === (new Date(b)).getTime(),
    TimestampGreaterThan: (a, b) => new Date(a) > new Date(b),
    TimestampGreaterThanEquals: (a, b) => new Date(a) >= new Date(b),
    TimestampLessThan: (a, b) => new Date(a) < new Date(b),
    TimestampLessThanEquals: (a, b) => new Date(a) <= new Date(b)
};

function applyOperation(choice, io) {
    if (choice.Variable) return applyRule(choice, io);
    // TODO: handle And, Or, Not...
}

function applyRule(rule, io) {
    const { value, operation, comparisonValue } = normalizeRule(rule, io);
    return ruleOperations[r.operation](value, comparisonValue);
}

function normalizeRule(rule, io) {
    const { Variable, ...rest } = rule;
    const value = JSONPath.query(io, Variable);
    const operation = Object(rest).keys().shift();
    const comparisonValue = rest[operation];
    return { value, operation, comparisonValue };
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
        if (state.ResultPath == null) return await value;
        return set(getIO(), state.ResultPath, await value);
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
        result[key.slice(0, -2)] = JSONPath.query(data, value).shift();
    } else {
        result[key] = recur(value[key]);
    }
    return result;
}

module.exports = { Trajectory };
