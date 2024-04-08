import Joi from 'joi';

const BaseState = Joi.object({
    Next: Joi.string().optional(),
    End: Joi.boolean().optional(),
    InputPath: Joi.string().optional(),
    OutputPath: Joi.string().optional(),
    Comment: Joi.string().optional(),
});

const Pass = BaseState.keys({
    Type: Joi.string().valid('Pass').required(),
    Result: Joi.any().optional(),
    ResultPath: Joi.string().optional(),
    Parameters: Joi.any().optional(),
});

const Task = BaseState.keys({
    Type: Joi.string().valid('Task').required(),
    Handler: Joi.string().required(),
    ResultPath: Joi.string().optional(),
    Parameters: Joi.any().optional(),
    Retry: Joi.array().items(Joi.object()).optional(),
    Catch: Joi.object().optional(),
    Timeout: Joi.number().optional(),
});

const Choice = BaseState.keys({
    Type: Joi.string().valid('Choice').required(),
    Choices: Joi.array().items(Joi.object()).optional(),
    Default: Joi.string().optional(),
});

const Wait = BaseState.keys({
    Type: Joi.string().valid('Wait').required(),
    Seconds: Joi.number().optional(),
    Timestamp: Joi.string().optional(),
    SecondsPath: Joi.string().optional(),
    TimestampPath: Joi.string().optional(),
});

const Succeed = BaseState.keys({
    Type: Joi.string().valid('Succeed').required(),
});

const Fail = BaseState.keys({
    Type: Joi.string().valid('Fail').required(),
    Error: Joi.string().optional(),
    Cause: Joi.string().optional(),
});

const StateMachineSchema = Joi.object({
    StartAt: Joi.string().required(),
    States: Joi.link('#stateMachine.states'), // This link refers to the States definition inside the StateMachine schema.
    Comment: Joi.string().optional(),
}).id('stateMachine');

const Parallel = BaseState.keys({
    Type: Joi.string().valid('Parallel').required(),
    Branches: Joi.array().items(Joi.link('#stateMachine')), // Link to the StateMachine schema
    ResultPath: Joi.string().optional(),
    Retry: Joi.array().items(Joi.object()).optional(),
    Catch: Joi.object().optional(),
});

const States = Joi.object().pattern(Joi.string(), Joi.alternatives().try(
    Pass,
    Task,
    Choice,
    Wait,
    Succeed,
    Fail,
    Parallel
)).id('states');

export const StateMachine = StateMachineSchema.keys({
    States: States.required()
});
