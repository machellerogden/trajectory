import { withEffects, fx } from 'with-effects';
import { JSONPathQuery, JSONPathParts, applyPath, assocPath, applyDataTemplate } from './lib/io.js';
import { StateMachine as StateMachineSchema } from './lib/schema.js';
import { findChoice } from './lib/rules.js';
import { sleep } from './lib/utils.js';
import { DefaultLogger } from './lib/log.js';
import Joi from 'joi';
import { STATUS, STATE } from './lib/constants.js';

async function* StateTransition(States, stateKey, input) {
    if (!(stateKey in States)) throw new Error(`Unhandled state: ${stateKey}`);
    const state = States[stateKey];

    yield fx('InitializeState', stateKey, state, input);

    yield fx('StateInfo', 'StateInitialized', input);

    let status;
    let handlerInput = input;
    let output;

    if (state.InputPath) {
        [ status, handlerInput ] = yield fx('ProcessInputPath', input);
        yield fx('StateInfo', 'InputPath', state.InputPath, handlerInput);
    }

    if (state.Parameters) {
        [ status, handlerInput ] = yield fx('ProcessParameters', handlerInput);
        yield fx('StateInfo', 'Parameters', state.Parameters, handlerInput);
    }

    yield fx('StateInfo', 'StateEntered', handlerInput);

    yield fx('StateInfo', 'HandlerStarted', handlerInput);

    [ status, output ] = yield fx('ExecuteHandler', handlerInput);

    if (status == STATUS.ERROR) {
        yield fx('StateFail', 'HandlerFailed', output);
    } else {
        yield fx('StateSucceed', 'HandlerSucceeded', output);
    }

    if (state.ResultSelector) {
        [ status, output ] = yield fx('ProcessResultSelector', output);
        yield fx('StateInfo', 'ResultSelector', state.ResultSelector, output);
    }

    if (state.ResultPath) {
        [ status, output ] = yield fx('ProcessResultPath', input, output);
        yield fx('StateInfo', 'ResultPath', state.ResultPath, output);
    }

    if (state.OutputPath) {
        [ status, output ] = yield fx('ProcessOutputPath', output);
        yield fx('StateInfo', 'OutputPath', state.OutputPath, output);
    }

    yield fx('StateInfo', 'StateExited', output);

    let Next = state.Next;

    if (status == STATUS.ERROR) {
        Next = STATE.FAILED;
    } else if (state.End || Next == null) {
        Next = STATE.SUCCEEDED;
    }

    return [ Next, output ];
}

async function* StateMachine(machineDef, io) {
    let stateKey = machineDef.StartAt;
    const States = machineDef.States;

    yield fx('MachineStart', io);

    while (![ STATE.FAILED, STATE.SUCCEEDED ].includes(stateKey)) {
        [ stateKey, io ] = yield* StateTransition(States, stateKey, io);
    }

    if (stateKey == STATE.FAILED) {
        yield fx('MachineFail', io);
    } else {
        yield fx('MachineSucceed', io);
    }

    return [ stateKey, io ];
}

const stateHandlers = {

    async Pass(context, input) {
        const state = context.state;

        return [ STATUS.OK, state.Result ?? input ];
    },

    async Task(context, input) {
        const state = context.state;

        try {
            const result = await context.handlers[state.Resource](input);

            return [ STATUS.OK, result ];
        } catch (error) {
            return [ STATUS.ERROR, error ];
        }
    },

    async Parallel(context, input) {
        const state = context.state;

        try {

            context.depth++;

            let result = await Promise.all(
                state.Branches.map(async branch =>
                    executeMachine(branch, context, input)));

            context.depth--;

            const errors = result.filter(([ status ]) => status == STATUS.ERROR).map(([_, error ]) => error);

            if (errors.length > 0) {
                return [ STATUS.ERROR, errors ];
            }

            result = result.map(([_, output]) => output);

            return [ STATUS.OK, result ];
        } catch (error) {
            return [ STATUS.ERROR, error ];
        }
    },
    async Choice(context, input) {
        const state = context.state;

        try {

            const choice = findChoice(state.Choices, input);
            const Next = choice == null ? state.Default : choice.Next;

            if (Next == null) throw new Error(`no where to go`);

            delete state.End;
            state.Next = Next;

            return [ STATUS.OK, input ];
        } catch (error) {
            return [ STATUS.ERROR, error ];
        }
    },
    async Succeed(context, input) {
        return [ STATUS.OK, input ];
    },
    async Fail(context, error) {
        return [ STATUS.ERROR, error ];
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
            return [ STATUS.OK, input ];
        } catch (error) {
            return [ STATUS.ERROR, error ];
        }
    }
};

function selectInputPath(context, input) {
    const { state } = context;
    try {
        input = applyPath(state.InputPath, input);
        return [ STATUS.OK, input ];
    } catch (error) {
        return [ STATUS.ERROR, error ];
    }
}

function applyInputToParameters(context, input) {
    const { state } = context;
    try {
        input = applyDataTemplate(state.Parameters, input);
        return [ STATUS.OK, input ];
    } catch (error) {
        return [ STATUS.ERROR, error ];
    }
}

function selectResult(context, output) {
    const { state } = context;
    try {
        output = applyPath(state.ResultSelector, output);
        return [ STATUS.OK, output ];
    } catch (error) {
        return [ STATUS.ERROR, error ];
    }
}

function assocResultPath(context, input, output) {
    const { state } = context;
    try {
        output = assocPath(state.ResultPath, input, output);
        return [ STATUS.OK, output ];
    } catch (error) {
        return [ STATUS.ERROR, error ];
    }
}

function selectOutputPath(context, output) {
    const { state } = context;
    try {
        output = applyPath(state.OutputPath, output);
        return [ STATUS.OK, output ];
    } catch (error) {
        return [ STATUS.ERROR, error ];
    }
}

async function executeHandler(context, input) {
    const { state } = context;

    if (!(state.Type in stateHandlers)) throw new Error(`Unhandled state type: ${state.Type}`);

    const handler = stateHandlers[state.Type];
    const [ status, output ] = await handler(context, input);

    return [ status, output ];
}

function handleLogEffect(context, effect, ...args) {
    context.log(effect, ...args);
    return [ STATUS.OK, null ];
}

const logEffects = {
    'StateInfo': handleLogEffect,
    'StateSucceed': handleLogEffect,
    'StateFail': handleLogEffect,
    'MachineStart': handleLogEffect,
    'MachineSucceed': handleLogEffect,
    'MachineFail': handleLogEffect
};

const wrapStateOperation = (fn) => async function handleStateEffect(context, ...args) {
    try {
        const [ status, output ] = await fn(context, ...args);
        context.status = status;
        return [ status, output ];
    } catch (error) {
        return [ STATUS.ERROR, error ];
    }
};

function initializeState(context, stateKey, state, input) {
    context.stateKey = stateKey;
    context.state = state;
    return [ STATUS.OK, null ];
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
    context = Object.create(context ?? {});
    context.stateKey = context.stateKey ?? machineDef.StartAt;
    context.state = context.state ?? machineDef.States[context.stateKey];
    context.depth = context.depth ?? 1;
    context.handlers = context.handlers ?? {}
    context.quiet = context.quiet ?? true;
    context.log = context.quiet ? () => {} : DefaultLogger(context);

    return context;
}

export async function executeMachine(machineDef, context, input) {
    try {
        context = initializeContext(context, machineDef, input);

        const { error, value } = StateMachineSchema.validate(machineDef);

        if (error instanceof Joi.ValidationError) {
            console.error('errors', error.details.map(d => d.message));
            throw error;
        } else {
            machineDef = value;
        }

        input = input ?? {};

        const [ finalState, output ] = await withEffects(
            StateMachine(machineDef, input),
            Executor(context, machineDef)
        );

        return [ finalState, output ];
    } catch (error) {
        return [ STATUS.ERROR, error ];
    }

}
