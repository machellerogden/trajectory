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

const [ major ] = require('../version').split('.');
const versionRegExp = new RegExp(`^${major}\\.?\\d+?.\\d+?`);

const baseStateSchema = object({
    next: string(),
    end: boolean(),
    inputPath: string(),
    outputPath: string(),
    comment: string()
});

const passSchema = baseStateSchema.concat(object({
    type: string().valid('pass').required(),
    result: any(),
    resultPath: string(),
    parameters: any()
}));

const taskSchema = baseStateSchema.concat(object({
    type: string().valid('task').required(),
    fn: func(),
    resultPath: string(),
    parameters: any(),
    retry: array().items(object({
        errorEquals: array().items(string()),
        maxAttempts: number(),
        intervalSeconds: number(),
        backoffRate: number()
    })),
    catch: array().items(object()),
    timeoutSeconds: number()
}));

const choiceSchema = baseStateSchema.concat(object({
    type: string().valid('choice').required(),
    choices: array().items(object()),
    default: string()
}));

const waitSchema = baseStateSchema.concat(object({
    type: string().valid('wait').required(),
    seconds: number(),
    timestamp: string(),
    secondsPath: string(),
    timestampPath: string(),
}));

const succeedSchema = baseStateSchema.concat(object({
    type: string().valid('succeed').required()
}));

const failSchema = baseStateSchema.concat(object({
    type: string().valid('fail').required(),
    error: string(),
    cause: string()
}));

const parallelSchema = baseStateSchema.concat(object({
    type: string().valid('parallel').required(),
    branches: array().items(lazy(() => queueSchema)),
    resultPath: string(),
    retry: object(),
    catch: object()
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

const queueSchema = object({
    startAt: string(),
    states: statesSchema 
});

const definitionSchema = object({
    kind: string().valid('queue'),
    version: string().regex(versionRegExp).required(),
    spec: queueSchema
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
    reporterOptions: object()
});

const inputSchema = any(); // TODO - determine constraints on input

module.exports = { definitionSchema, optionsSchema, inputSchema };
