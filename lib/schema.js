'use strict';

const Joi = require('@hapi/joi');

const {
    alternatives,
    any,
    object,
    array,
    string,
    number,
    boolean,
    func,
    lazy
} = Joi.bind();

const baseStateSchema = object({
    Next: string(),
    End: boolean(),
    InputPath: string(),
    OutputPath: string(),
    Comment: string()
});

const passSchema = baseStateSchema.concat(object({
    Type: string().valid('Pass').required(),
    Result: any(),
    ResultPath: string(),
    Parameters: any()
}));

const taskSchema = baseStateSchema.concat(object({
    Type: string().valid('Task').required(),
    Resource: alternatives([ string(), func() ]).required(),
    ResultPath: string(),
    Parameters: any(),
    Retry: array().items(object({
        ErrorEquals: array().items(string()),
        MaxAttempts: number(),
        IntervalSeconds: number(),
        BackoffRate: number()
    })),
    Catch: array().items(object()),
    TimeoutSeconds: number()
}));

const choiceSchema = baseStateSchema.concat(object({
    Type: string().valid('Choice').required(),
    Choices: array().items(object()).required(),
    Default: string()
}));

const waitSchema = baseStateSchema.concat(object({
    Type: string().valid('Wait').required(),
    Seconds: number(),
    Timestamp: string(),
    SecondsPath: string(),
    TimestampPath: string(),
}));

const succeedSchema = baseStateSchema.concat(object({
    Type: string().valid('Succeed').required()
}));

const failSchema = baseStateSchema.concat(object({
    Type: string().valid('Fail').required(),
    Error: string(),
    Cause: string()
}));

const parallelSchema = baseStateSchema.concat(object({
    Type: string().valid('Parallel').required(),
    Branches: array().items(lazy(() => stateMachineSchema)),
    ResultPath: string(),
    Retry: object(),
    Catch: object()
}));

const stateSchema = alternatives([
    passSchema,
    taskSchema,
    choiceSchema,
    waitSchema,
    succeedSchema,
    parallelSchema,
    failSchema
]);

const statesSchema = object().pattern(string(), stateSchema);

const stateMachineSchema = object({
    Comment: string(),
    StartAt: string(),
    States: statesSchema
});

const optionsSchema = object({
    debug: boolean(),
    silent: boolean(),
    reporter: object({
        start: func(),
        succeed: func(),
        fail: func(),
        info: func(),
        complete: func()
    }),
    reporterOptions: object(),
    resources: object()
});

const inputSchema = any(); // TODO - determine constraints on input

module.exports = { stateMachineSchema, optionsSchema, inputSchema };
