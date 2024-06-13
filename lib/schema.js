import Joi from 'joi';

const BaseState = Joi.object({
    Next: Joi.string().optional(),
    End: Joi.boolean().optional(),
    InputPath: Joi.string().optional(),
    OutputPath: Joi.string().optional(),
    Comment: Joi.string().optional(),
});

const PassState = BaseState.keys({
    Type: Joi.string().valid('Pass').required(),
    Result: Joi.any().optional(),
    ResultPath: Joi.string().optional(),
    Parameters: Joi.any().optional(),
});

const TaskState = BaseState.keys({
    Type: Joi.string().valid('Task').required(),
    Resource: Joi.string().required(),
    ResultPath: Joi.string().optional(),
    Parameters: Joi.any().optional(),
    Retry: Joi.array().items(Joi.object()).optional(),
    Catch: Joi.object().optional(),
    Timeout: Joi.number().optional(),
});

const ChoiceState = BaseState.keys({
    Type: Joi.string().valid('Choice').required(),
    Choices: Joi.array().items(Joi.object()).optional(),
    Default: Joi.string().optional(),
});

const WaitState = BaseState.keys({
    Type: Joi.string().valid('Wait').required(),
    Seconds: Joi.number().optional(),
    Timestamp: Joi.string().optional(),
    SecondsPath: Joi.string().optional(),
    TimestampPath: Joi.string().optional(),
});

const SucceedState = BaseState.keys({
    Type: Joi.string().valid('Succeed').required(),
});

const FailState = BaseState.keys({
    Type: Joi.string().valid('Fail').required(),
    Error: Joi.string().optional(),
    Cause: Joi.string().optional(),
});

const StateMachineSchema = Joi.object({
    StartAt: Joi.string().required(),
    States: Joi.link('#stateMachine.states'), // This link refers to the States definition inside the StateMachine schema.
    Comment: Joi.string().optional(),
}).id('stateMachine');

const ParallelState = BaseState.keys({
    Type: Joi.string().valid('Parallel').required(),
    Branches: Joi.array().items(Joi.link('#stateMachine')), // Link to the StateMachine schema
    ResultPath: Joi.string().optional(),
    Retry: Joi.array().items(Joi.object()).optional(),
    Catch: Joi.object().optional(),
});

const MapState = BaseState.keys({
    Type: Joi.string().valid('Map').required(),
    ItemsPath: Joi.string().required(),
    ItemProcessor: Joi.link('#stateMachine'), // Link to the StateMachine schema
    ResultPath: Joi.string().optional(),
});

const States = Joi.object().pattern(Joi.string(), Joi.alternatives().try(
    PassState,
    TaskState,
    ChoiceState,
    WaitState,
    SucceedState,
    FailState,
    ParallelState,
    MapState
)).id('states');

export const StateMachine = StateMachineSchema.keys({
    States: States.required()
});
