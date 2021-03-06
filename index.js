'use strict';

const byline = require('byline');
const CancellationContext = require('cancellation-context');
const { ChildProcess } = require('child_process');
const { EventEmitter } = require('events');
const clone = require('lodash/cloneDeep');
const set = require('lodash/set');
const compose = require('lodash/fp/compose');
const ordinal = require('ordinal');
const { EOL } = require('os');
const serializeError = require('serialize-error');
const { Handlers } = require('./lib/handlers');
const { isEnd, FindError, abort } = require('./lib/helpers');
const { asPath } = require('./lib/io');
const  builtInReporter = require('./lib/reporter');
const { stateMachineSchema, optionsSchema, inputSchema } = require('./lib/schema');
const { sleep } = require('./lib/util');

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
            const attemptResult = await fn(state, io);
            let data = attemptResult;

            let streamed = false;

            if (type != 'Parallel' && attemptResult instanceof ChildProcess) {

                streamed = true;

                const handleExit = (name, type, code) =>
                    code === 0 ? emit({ type: 'stdout', name, closed: true, stateType: type })
                  : code >= 0  ? emit({ type: 'stderr', name, closed: true, stateType: type })
                  :              void 0;

                const streamPromise = new Promise((resolve, reject) => {
                    let data = '';
                    byline(attemptResult.stdout).on('data', ((name, type) => line => {
                        emit({ type: 'stdout', name, data: line.toString(), stateType: type });
                        data += `${line}${EOL}`;
                    })(name, type));
                    byline(attemptResult.stderr).on('data', ((name, type) => line => {
                        emit({ type: 'stderr', name, data: line.toString(), stateType: type });
                        data += `${line}${EOL}`;
                    })(name, type));
                    attemptResult.on('exit', ((name, type) => code => {
                        handleExit(name, type, code);
                        if (code != 0) return reject(new Error(`process exited with status code \`${code}\``));
                        return resolve(data);
                    })(name, type));
                    attemptResult.on('error', ((name, type) => error => {
                        emit({ type: 'stderr', name, data: err.message, stateType: type });
                        return reject(error);
                    })(name, type));
                });

                data  = (await streamPromise).toString().trimRight();
            }

            yield { name, data, stateType: type, streamed };
            emit({ type: 'info', name, data, stateType: type, streamed });
            emit({ type: 'succeed', name, data, stateType: type, streamed });

            io = clone(data);
        }

        async function* handleError(fn, error, type) {
            const message = `"${name}" failed with error "${error.message || JSON.stringify(error)}".`;
            emit({ type: 'info', name, message, stateType: type });
            const findError = FindError(error);
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

module.exports = {
    Trajectory
};
