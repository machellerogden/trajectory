import { withEffects, fx } from 'with-effects';
import { JSONPathQuery, JSONPathParts, applyPath, assocPath, applyDataTemplate } from './lib/io.js';
import { StateMachine as StateMachineSchema } from './lib/schema.js';
import { findChoice } from './lib/rules.js';
import { compose, sleep } from './lib/utils.js';
import { logMachineInfo, logMachineSucceed, logMachineFail, logStateInfo, logStateSucceed, logStateFail } from './lib/log.js';
import Joi from 'joi';
import { STATUS, STATE } from './lib/constants.js';

async function* StateTransition(States, stateKey, input) {
    if (!(stateKey in States)) throw new Error(`Unhandled state: ${stateKey}`);
    const state = States[stateKey];

    yield fx('InitializeState', stateKey, state, input);

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

const executionHandlers = {

    async Pass(context, input) {
        const state = context.state;

        return [ STATUS.OK, state.Result ?? input ];
    },

    async Task(context, input) {
        const state = context.state;

        try {
            const result = await context.handlers[state.Handler](input);

            return [ STATUS.OK, result ];
        } catch (error) {
            return [ STATUS.ERROR, error ];
        }
    },

    async Parallel(context, input) {
        const state = context.state;

        try {

            context.depth++;

            let result = await Promise.all(state.Branches.map(async branch => {
                try {
                    const [ finalState, output ] = await executeMachine(branch, context, input);

                    if (finalState == STATE.FAILED) {
                        return [ STATUS.ERROR, output ];
                    }
                    return [ STATUS.OK, output ];
                } catch (error) {
                    return [ STATUS.ERROR, error ];
                }
            }));

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
        const choice = findChoice(state.Choices, input);
        const Next = choice == null
            ? state.Default
            : choice.Next;

        if (Next == null) throw new Error(`no where to go`);

        delete state.End;
        state.Next = Next;

        return [ STATUS.OK, input ];
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

    if (!(state.Type in executionHandlers)) throw new Error(`Unhandled state type: ${state.Type}`);

    let status;
    let output;

    try {
        const handler = executionHandlers[state.Type];
        [ status, output ] = await handler(context, input);
    } catch (error) {
        status = STATUS.ERROR;
        output = error;
    }

    return [ status, output ];
}

const Executor = (context, machineDef) => async (effect, ...args) => {
    const { state } = context;

    if (effect == 'StateInfo') {
        context.log('info', 'State', ...args);
        return [ STATUS.OK, null ];
    }

    if (effect == 'StateFail') {
        context.log('fail', 'State', ...args);
        return [ STATUS.OK, null ];
    }

    if (effect == 'StateSucceed') {
        context.log('succeed', 'State', ...args);
        return [ STATUS.OK, null ];
    }

    if (effect == 'MachineStart') {
        context.log('succeed', 'Machine', '+', 'MachineStarted', args);
        return [ STATUS.OK, null ];
    }

    if (effect == 'MachineInfo') {
        context.log('info', 'Machine', '•', ...args);
        return [ STATUS.OK, null ];
    }

    if (effect == 'MachineFail') {
        context.log('fail', 'Machine', '-', 'MachineFailed', ...args);
        return [ STATUS.OK, null ];
    }

    if (effect == 'MachineSucceed') {
        context.log('succeed', 'Machine', '-', 'MachineSucceeded', ...args);
        return [ STATUS.OK, null ];
    }

    if (effect == 'InitializeState') {
        const [ stateKey, state, input ] = args;
        context.stateKey = stateKey;
        context.state = state;
        context.log('info', 'State', 'StateInitialized', input);
        return [ STATUS.OK, null ];
    }

    if (effect == 'ProcessInputPath') {
        const [ input ] = args;
        const [ status, handlerInput ] = selectInputPath(context, input);
        context.status = status;
        return [ status, handlerInput ];
    }

    if (effect == 'ProcessParameters') {
        const [ input ] = args;
        const [ status, handlerInput ] = applyInputToParameters(context, input);
        context.status = status;
        return [ status, handlerInput ];
    }

    if (effect == 'ExecuteHandler') {
        const [ handlerInput ] = args;
        const [ status, output ] = await executeHandler(context, handlerInput);
        context.status = status;
        return [ status, output ];
    }

    if (effect == 'ProcessResultSelector') {
        const [ output ] = args;
        const [ status, result ] = selectResult(context, output);
        return [ status, result ];
    }

    if (effect == 'ProcessResultPath') {
        const [ input, output ] = args;
        const [ status, result ] = assocResultPath(context, input, output);
        return [ status, result ];
    }

    if (effect == 'ProcessOutputPath') {
        const [ output ] = args;
        const [ status, selectedOutput ] = selectOutputPath(context, output);
        return [ status, selectedOutput ];
    }

    throw new Error(`Unhandled effect: ${effect}`);
};

function initializeContext(context, machineDef, input) {
    context = Object.create(context ?? {});
    context.stateKey = context.stateKey ?? machineDef.StartAt;
    context.state = context.state ?? machineDef.States[context.stateKey];
    context.depth = context.depth ?? 1;
    context.handlers = context.handlers ?? {}

    context.quiet = context.quiet ?? true;

    if (context.quiet) {
        context.log = () => {};
    } else {
        context.log = context.log ?? ((logStatus, logType, ...args) => {
            if (logType == 'State') {
                if (logStatus == 'info') {
                    return logStateInfo(context, ...args);
                } else if (logStatus == 'succeed') {
                    return logStateSucceed(context, ...args);
                } else if (logStatus == 'fail') {
                    return logStateFail(context, ...args);
                }
            } else if (logType == 'Machine') {
                if (logStatus == 'info') {
                    return logMachineInfo(context, ...args);
                } else if (logStatus == 'succeed') {
                    return logMachineSucceed(context, ...args);
                } else if (logStatus == 'fail') {
                    return logMachineFail(context, ...args);
                }
            }
        });
    }

    return context;
}

export async function executeMachine(machineDef, context, input) {

    context = initializeContext(context, machineDef, input);

    const { error, value  } = StateMachineSchema.validate(machineDef);

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
}
