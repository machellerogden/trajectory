import { withEffects, fx } from 'with-effects';
import { JSONPathQuery, JSONPathParts, applyPath, assocPath, applyDataTemplate } from './io.js';
import { StateMachine as StateMachineSchema } from './schema.js';
import { findChoice } from './rules.js';
import { sleep, deepClone, tolerantConcurrencyLimitedMap } from './utils.js';
import { DefaultLogger } from './log.js';
import Joi from 'joi';
import { STATUS, STATE, EVENT, ERROR } from './constants.js';
import { StatesError } from './errors.js';

function matchError(error, retryArray) {
    const errorName = error?.name ?? '';
    const errorMessage = error?.message ?? '';

    for (let i = 0; i < retryArray.length; i++) {
        const retryBlock = retryArray[i];
        for (const e of retryBlock.ErrorEquals) {
            if (e === 'States.ALL' || e === errorName || e === errorMessage) {
                return { retryBlock, index: i };
            }
        }
    }
    return null; // no match
}

async function* StateTransition(States, stateKey, input) {
    if (!(stateKey in States)) throw new Error(`Unhandled state: ${stateKey}`);
    const state = States[stateKey];

    yield fx('InitializeState', stateKey, state, input);
    yield fx(EVENT.StateInfo, 'StateInitialized', input);

    let status;
    let handlerInput = input;
    let output;

    if (state.InputPath) {
        [ status, handlerInput ] = yield fx('ProcessInputPath', input);
        yield fx(EVENT.StateInfo, 'InputPath', state.InputPath, handlerInput);
    }

    if (state.Parameters) {
        [ status, handlerInput ] = yield fx('ProcessParameters', handlerInput);
        yield fx(EVENT.StateInfo, 'Parameters', state.Parameters, handlerInput);
    }

    yield fx(EVENT.StateInfo, 'StateEntered', handlerInput);
    yield fx(EVENT.StateInfo, 'HandlerStarted', handlerInput);

    // Keep track of how many times we've retried for each Retry block
    const retryCounts = state.Retry?.map(() => 0) || [];

    while (true) {
        [ status, output ] = yield fx('ExecuteHandler', handlerInput);

        if (status !== STATUS.ERROR) {
            // Handler succeeded
            break;
        }

        // Handler threw an error => see if there's a matching Retry
        if (Array.isArray(state.Retry) && state.Retry.length > 0) {
            const match = matchError(output, state.Retry);
            if (match) {
                const { retryBlock, index } = match;
                retryCounts[index]++;

                if (retryCounts[index] >= (retryBlock.MaxAttempts ?? 3)) {
                    yield fx(EVENT.StateFail, 'HandlerFailed', output);
                    [ status, output ] = yield* handleCatchOrThrow(state, output);
                    return [ status, output ];
                } else {
                    const interval = (retryBlock.IntervalSeconds ?? 1);
                    const backoff = (retryBlock.BackoffRate ?? 2);
                    const attemptsSoFar = retryCounts[index];
                    const delay = interval * Math.pow(backoff, attemptsSoFar - 1) * 1000;
                    await sleep(delay);
                    continue; // re-invoke the handler
                }
            }
        }

        // If no Retry matches or no Retry array => attempt Catch or throw
        yield fx(EVENT.StateFail, 'HandlerFailed', output);
        [ status, output ] = yield* handleCatchOrThrow(state, output);
        return [ status, output ];
    }

    // If we get here, status == STATUS.OK => success
    yield fx(EVENT.StateSucceed, 'HandlerSucceeded', output);

    if (state.ResultSelector) {
        [ status, output ] = yield fx('ProcessResultSelector', output);
        yield fx(EVENT.StateInfo, 'ResultSelector', state.ResultSelector, output);
    }

    if (state.ResultPath) {
        [ status, output ] = yield fx('ProcessResultPath', input, output);
        yield fx(EVENT.StateInfo, 'ResultPath', state.ResultPath, output);
    }

    if (state.OutputPath) {
        [ status, output ] = yield fx('ProcessOutputPath', output);
        yield fx(EVENT.StateInfo, 'OutputPath', state.OutputPath, output);
    }

    yield fx(EVENT.StateInfo, 'StateExited', output);

    let Next = state.Next;
    if (state.End || Next == null) {
        Next = STATE.SUCCEEDED;
    }

    return [ Next, output ];
}

function* handleCatchOrThrow(state, errorOutput) {
    const catchers = state.Catch ?? [];
    const errorName = errorOutput.name || '';
    const errorMessage = errorOutput.message || '';

    for (const catcher of catchers) {
        for (const e of catcher.ErrorEquals) {
            if (e === 'States.ALL' || e === errorName || e === errorMessage) {
                // We have a match => jump to the catcher's Next
                return [ catcher.Next, errorOutput ];
            }
        }
    }
    // No Catch matches => re-throw
    throw errorOutput;
}

async function* StateMachine(machineDef, io) {
    let stateKey = machineDef.StartAt;
    const States = machineDef.States;

    yield fx(EVENT.MachineStart, io);

    while (![STATE.FAILED, STATE.SUCCEEDED].includes(stateKey)) {
        try {
            [ stateKey, io ] = yield* StateTransition(States, stateKey, io);
        } catch (error) {
            stateKey = STATE.FAILED;
            io = error;
        }
    }

    if (stateKey === STATE.FAILED) {
        yield fx(EVENT.MachineFail, io);
    } else {
        yield fx(EVENT.MachineSucceed, io);
    }

    return [ stateKey, io ];
}

async function applyRunner(runnerDef, context, input) {
    const params = runnerDef.Parameters
        ? applyDataTemplate(context, runnerDef.Parameters, input)
        : input;

    try {
        const resourceFn = context.handlers[runnerDef.Resource];
        if (!resourceFn) {
            throw new Error(`No handler found for resource: ${runnerDef.Resource}`);
        }
        const output = await resourceFn(params);
        return [STATUS.OK, output];
    } catch (err) {
        return [STATUS.ERROR, err];
    }
}

function interpretToleranceParams(state) {
    const hasCount = typeof state.ToleratedFailureCount === 'number';
    const hasPct = typeof state.ToleratedFailurePercentage === 'number';

    let toleratedFailureCount;
    let toleratedFailurePercentage;

    if (hasCount) {
        toleratedFailureCount = state.ToleratedFailureCount;
    } else if (hasPct) {
        toleratedFailureCount = Infinity; // no count-based limit
    } else {
        // neither is set => any failure => abort
        toleratedFailureCount = 0;
    }

    if (hasPct) {
        toleratedFailurePercentage = state.ToleratedFailurePercentage;
    } else if (hasCount) {
        toleratedFailurePercentage = 100; // no percentage-based limit
    } else {
        // neither is set => any failure => abort
        toleratedFailurePercentage = 0;
    }

    return { toleratedFailureCount, toleratedFailurePercentage };
}

async function executeMapState(context, input) {
    const state = context.state;

    let maxConcurrency = state.MaxConcurrency ?? Infinity;

    if (state.MaxConcurrencyPath) {
        const pathVal = JSONPathQuery(state.MaxConcurrencyPath, input);
        if (typeof pathVal === 'number' && !Number.isNaN(pathVal)) {
            maxConcurrency = pathVal;
        }
    }

    const { toleratedFailureCount, toleratedFailurePercentage } = interpretToleranceParams(state);

    let items;
    if (state.ItemReader) {
        const [ status, output ] = await applyRunner(state.ItemReader, context, input);
        if (status === STATUS.ERROR) throw output; // fail the entire map state
        if (!Array.isArray(output)) {
            throw new Error('ItemReader must return an array.');
        }
        items = output;
    } else {
        const itemValues = JSONPathQuery(state.ItemsPath, input);
        if (!Array.isArray(itemValues)) {
            throw new Error(`Map state expects array at ItemsPath: ${state.ItemsPath}`);
        }
        items = itemValues;
    }

    if (state.ItemBatcher) {
        const [ status, batched ] = await applyRunner(state.ItemBatcher, context, items);
        if (status === STATUS.ERROR) throw batched;
        items = batched;
    }

    const itemInputs = items.map((itemValue, itemIndex) => {
        const itemContext = Object.create(context);
        itemContext.Map = { Item: {
            Value: itemValue,
            Index: itemIndex,
            // Let "Parent" default to context.Map?.Item or the entire input
            Parent: context?.Map?.Item ?? input
        }};
        return applyDataTemplate(itemContext, state.ItemSelector, input);
    });

    const iterationResults = await tolerantConcurrencyLimitedMap(
        itemInputs,
        maxConcurrency,
        async function iteratee(itemInput, index, signal) {
            if (signal.aborted) {
                return [{ error: new Error('Aborted') }];
            }
            const [ finalState, output ] = await executeMachine(state.ItemProcessor, context, itemInput);
            if (finalState === STATE.FAILED) {
                throw output;
            } else {
                return output;
            }
        },
        {
            maxFailures: toleratedFailureCount,
            maxFailurePercentage: toleratedFailurePercentage
        }
    );

    if (state.ResultWriter) {
        const [ status, final ] = await applyRunner(state.ResultWriter, context, iterationResults);
        if (status === STATUS.ERROR) throw final;
        return final;
    } else {
        return iterationResults;
    }
}

const stateHandlers = {
    async Pass(context, input) {
        const state = context.state;
        return [STATUS.OK, state.Result ?? input];
    },
    async Task(context, input) {
        const state = context.state;
        const timeout = state.TimeoutSeconds ? state.TimeoutSeconds * 1000 : null;

        try {
            const result = await (timeout
                ? Promise.race([
                    context.handlers[state.Resource](input),
                    new Promise((_, reject) =>
                        setTimeout(() => reject(new StatesError(ERROR.States.Timeout)), timeout)
                    )
                ])
                : context.handlers[state.Resource](input)
            );
            return [STATUS.OK, result];
        } catch (error) {
            return [STATUS.ERROR, error];
        }
    },
    async Parallel(context, input) {
        const state = context.state;
        try {
            context.depth++;
            let result = await Promise.all(
                state.Branches.map(async (branch) => executeMachine(branch, context, input))
            );
            context.depth--;
            const errors = result
            .filter(([status]) => status === STATUS.ERROR)
            .map(([_, error]) => error);

            if (errors.length > 0) {
                return [STATUS.ERROR, errors];
            }
            result = result.map(([_, output]) => output);
            return [STATUS.OK, result];
        } catch (error) {
            return [STATUS.ERROR, error];
        }
    },
    async Choice(context, input) {
        const state = context.state;
        try {
            const choice = findChoice(state.Choices, input);
            const Next = choice == null ? state.Default : choice.Next;
            if (Next == null) throw new Error('no where to go');
            delete state.End;
            state.Next = Next;
            return [STATUS.OK, input];
        } catch (error) {
            return [STATUS.ERROR, error];
        }
    },
    async Succeed(context, input) {
        return [STATUS.OK, input];
    },
    async Fail(context, error) {
        return [STATUS.ERROR, error];
    },
    async Wait(context, input) {
        const state = context.state;
        let delay = 0;
        try {
            if (state.Seconds != null) {
                delay = state.Seconds * 1000;
            } else if (state.SecondsPath != null) {
                delay = JSONPathQuery(state.SecondsPath, input) * 1000;
            } else if (state.TimestampPath != null) {
                const timestamp = JSONPathQuery(state.TimestampPath, input);
                delay = new Date(timestamp) - Date.now();
            } else if (state.Timestamp != null) {
                delay = new Date(state.Timestamp) - Date.now();
            }
            await sleep(delay);
            return [STATUS.OK, input];
        } catch (error) {
            return [STATUS.ERROR, error];
        }
    },
    async Map(context, input) {
        try {
            const output = await executeMapState(context, input);
            return [STATUS.OK, output];
        } catch (error) {
            return [STATUS.ERROR, error];
        }
    }
};

function selectInputPath(context, input) {
    const { state } = context;
    try {
        input = applyPath(context, state.InputPath, input);
        return [STATUS.OK, input];
    } catch (error) {
        return [STATUS.ERROR, error];
    }
}

function applyInputToParameters(context, input) {
    const { state } = context;
    try {
        input = applyDataTemplate(context, state.Parameters, input);
        return [STATUS.OK, input];
    } catch (error) {
        return [STATUS.ERROR, error];
    }
}

function selectResult(context, output) {
    const { state } = context;
    try {
        output = applyDataTemplate(context, state.ResultSelector, output);
        return [STATUS.OK, output];
    } catch (error) {
        return [STATUS.ERROR, error];
    }
}

function assocResultPath(context, input, output) {
    const { state } = context;
    try {
        output = assocPath(context, state.ResultPath, input, output);
        return [STATUS.OK, output];
    } catch (error) {
        return [STATUS.ERROR, error];
    }
}

function selectOutputPath(context, output) {
    const { state } = context;
    try {
        output = applyPath(context, state.OutputPath, output);
        return [STATUS.OK, output];
    } catch (error) {
        return [STATUS.ERROR, error];
    }
}

async function executeHandler(context, input) {
    const { state } = context;
    if (!(state.Type in stateHandlers)) throw new Error(`Unhandled state type: ${state.Type}`);
    const handler = stateHandlers[state.Type];
    const [status, output] = await handler(context, input);
    return [status, output];
}

function handleLogEffect(context, effect, ...args) {
    context.log(effect, ...args);
    return [STATUS.OK, null];
}

const logEffects = {
    [EVENT.StateInfo]: handleLogEffect,
    [EVENT.StateSucceed]: handleLogEffect,
    [EVENT.StateFail]: handleLogEffect,
    [EVENT.MachineStart]: handleLogEffect,
    [EVENT.MachineSucceed]: handleLogEffect,
    [EVENT.MachineFail]: handleLogEffect
};

const wrapStateOperation = (fn) => async function handleStateEffect(context, ...args) {
    try {
        const [status, output] = await fn(context, ...args);
        context.status = status;
        return [status, output];
    } catch (error) {
        return [STATUS.ERROR, error];
    }
};

function initializeState(context, stateKey, state, input) {
    context.stateKey = stateKey;
    context.state = state;
    return [STATUS.OK, null];
}

const stateEffects = {
    'ProcessInputPath': wrapStateOperation(selectInputPath),
    'ProcessParameters': wrapStateOperation(applyInputToParameters),
    'ExecuteHandler': wrapStateOperation(executeHandler),
    'ProcessResultSelector': wrapStateOperation(selectResult),
    'ProcessResultPath': wrapStateOperation(assocResultPath),
    'ProcessOutputPath': wrapStateOperation(selectOutputPath),
    'InitializeState': initializeState
};

const Executor = (context, machineDef) => async function effectHandler(effect, ...args) {
    const { state } = context;
    if (effect in logEffects) return logEffects[effect](context, effect, ...args);
    if (effect in stateEffects) return stateEffects[effect](context, ...args);
    throw new Error(`Unhandled effect: ${effect}`);
};

function initializeContext(context, machineDef, input) {
    context = deepClone(context ?? {});
    context.Map = context.Map ?? {};
    context.stateKey = context.stateKey ?? machineDef.StartAt;
    context.state = context.state ?? machineDef.States[context.stateKey];
    context.depth = context.depth ?? 1;
    context.handlers = context.handlers ?? {};
    context.quiet = context.quiet ?? true;
    context.log = context.quiet ? () => {} : DefaultLogger(context);
    return context;
}

export async function executeMachine(machineDef, context, input) {
    try {
        context = initializeContext(context, machineDef, input);
        const { error, value } = StateMachineSchema.validate(machineDef);
        if (error instanceof Joi.ValidationError) {
            throw error;
        } else {
            machineDef = value;
        }
        input = input ?? {};
        const [finalState, output] = await withEffects(
            StateMachine(machineDef, input),
            Executor(context, machineDef)
        );
        return [finalState, output];
    } catch (error) {
        return [STATE.FAILED, { error }];
    }
}
