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

// TODO: find better way to validate reference paths
const referencePathPattern = /^\$([\.\[][^@,:\?\*]*)?/;

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
    ResultPath: string().regex(referencePathPattern),
    Parameters: any()
}));

const taskSchema = baseStateSchema.concat(object({
    Type: string().valid('Task').required(),
    Resource: alternatives([ string(), func() ]).required(),
    ResultPath: string().regex(referencePathPattern),
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

const baseComparisonSchema = object({
    Variable: string().regex(referencePathPattern),
    Next: string()
});

const ruleBooleanEquals = baseComparisonSchema.concat(object({
    BooleanEquals: boolean()
}));

const ruleNumericEquals = baseComparisonSchema.concat(object({
    NumericEquals: number()
}));

const ruleNumericGreaterThan = baseComparisonSchema.concat(object({
    NumericGreaterThan: number()
}));

const ruleNumericGreaterThanEquals = baseComparisonSchema.concat(object({
    NumericGreaterThanEquals: number()
}));

const ruleNumericLessThan = baseComparisonSchema.concat(object({
    NumericLessThan: number()
}));

const ruleNumericLessThanEquals = baseComparisonSchema.concat(object({
    NumericLessThanEquals: number()
}));

const ruleStringEquals = baseComparisonSchema.concat(object({
    StringEquals: string()
}));

const ruleStringGreaterThan = baseComparisonSchema.concat(object({
    StringGreaterThan: string()
}));

const ruleStringGreaterThanEquals = baseComparisonSchema.concat(object({
    StringGreaterThanEquals: string()
}));

const ruleStringLessThan = baseComparisonSchema.concat(object({
    StringLessThan: string()
}));

const ruleStringLessThanEquals = baseComparisonSchema.concat(object({
    StringLessThanEquals: string()
}));

const ruleTimestampEquals = baseComparisonSchema.concat(object({
    TimestampEquals: alternatives([ string(), number() ])
}));

const ruleTimestampGreaterThan = baseComparisonSchema.concat(object({
    TimestampGreaterThan: alternatives([ string(), number() ])
}));

const ruleTimestampGreaterThanEquals = baseComparisonSchema.concat(object({
    TimestampGreaterThanEquals: alternatives([ string(), number() ])
}));

const ruleTimestampLessThan = baseComparisonSchema.concat(object({
    TimestampLessThan: alternatives([ string(), number() ])
}));

const ruleTimestampLessThanEquals = baseComparisonSchema.concat(object({
    TimestampLessThanEquals: alternatives([ string(), number() ])
}));

let allRules;

const ruleAnd = object({
    And: array().items(lazy(() => allRules)),
    Next: string()
});

const ruleOr = object({
    Or: array().items(lazy(() => allRules)),
    Next: string()
});

const ruleNot = object({
    Not: lazy(() => allRules),
    Next: string()
});

allRules = alternatives([
    ruleBooleanEquals,
    ruleNumericEquals,
    ruleNumericGreaterThan,
    ruleNumericGreaterThanEquals,
    ruleNumericLessThan,
    ruleNumericLessThanEquals,
    ruleStringEquals,
    ruleStringGreaterThan,
    ruleStringGreaterThanEquals,
    ruleStringLessThan,
    ruleStringLessThanEquals,
    ruleTimestampEquals,
    ruleTimestampGreaterThan,
    ruleTimestampGreaterThanEquals,
    ruleTimestampLessThan,
    ruleTimestampLessThanEquals,
    ruleAnd,
    ruleOr,
    ruleNot
]);

const choiceSchema = baseStateSchema.concat(object({
    Type: string().valid('Choice').required(),
    Choices: array().items(allRules).required(),
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
    ResultPath: string().regex(referencePathPattern),
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
    reporterOptions: object({
        cols: number(),
        compact: boolean(),
        gutterWidth: number(),
        printEvents: object({
            succeed: boolean(),
            start: boolean(),
            info: boolean(),
            fail: boolean(),
            error: boolean(),
            final: boolean(),
            complete: boolean(),
            stdout: boolean(),
            stderr: boolean()
        })
    }),
    reporter: object({
        start: func(),
        succeed: func(),
        fail: func(),
        error: func(),
        info: func(),
        complete: func()
    }),
    resources: object()
});

const inputSchema = alternatives([ string(), number(), boolean(), object(), array() ]).allow('').allow(null);

module.exports = { stateMachineSchema, optionsSchema, inputSchema };
