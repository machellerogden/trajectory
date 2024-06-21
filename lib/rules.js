import { JSONPathQuery } from './io.js';

const BooleanEquals = (a, b) => a === b;

const NumericEquals = (a, b) => a === b;

const NumericGreaterThan = (a, b) => a > b;

const NumericGreaterThanEquals = (a, b) => a >= b;

const NumericLessThan = (a, b) => a < b;

const NumericLessThanEquals = (a, b) => a <= b;

const StringEquals = (a, b) => a === b;

const StringGreaterThan = (a, b) => typeof a === 'string' && a.localeCompare(b) > 0;

const StringGreaterThanEquals = (a, b) => typeof a === 'string' && a.localeCompare(b) >= 0;

const StringLessThan = (a, b) => typeof a === 'string' && a.localeCompare(b) < 0;

const StringLessThanEquals = (a, b) => typeof a === 'string' && a.localeCompare(b) <= 0;

const TimestampEquals = (a, b) => (new Date(a)).getTime() === (new Date(b)).getTime();

const TimestampGreaterThan = (a, b) => new Date(a) > new Date(b);

const TimestampGreaterThanEquals = (a, b) => new Date(a) >= new Date(b);

const TimestampLessThan = (a, b) => new Date(a) < new Date(b);

const TimestampLessThanEquals = (a, b) => new Date(a) <= new Date(b);

const And = (a) => a.every(v => v === true);

const Or = (a) => a.some(v => v === true);

const Not = (a) => !a;

const IsBoolean = (a) => typeof a === 'boolean';

const IsNull = (a) => a == null;

const IsNumeric = (a) => typeof a === 'number';

const IsPresent = (a) => a != null;

const IsString = (a) => typeof a === 'string';

const IsTimestamp = (a) => {
    try {
        return new Date(a) !== 'Invalid Date' && !isNaN(new Date(a));
    } catch (e) {
        return false;
    }
};

const StringMatches = (a, b) => new RegExp(b).test(a);

const operations = {
    BooleanEquals,
    NumericEquals,
    NumericGreaterThan,
    NumericGreaterThanEquals,
    NumericLessThan,
    NumericLessThanEquals,
    StringEquals,
    StringGreaterThan,
    StringGreaterThanEquals,
    StringLessThan,
    StringLessThanEquals,
    TimestampEquals,
    TimestampGreaterThan,
    TimestampGreaterThanEquals,
    TimestampLessThan,
    TimestampLessThanEquals,
    And,
    Or,
    Not,
    StringMatches
};

function applyComparison(rule, data) {
    const { Variable, ...rest } = rule;
    const keys = Object.keys(rest);
    if (keys.length > 1) throw new Error('Only one comparison operation is allowed per rule');
    let [ operation ] = keys;
    const isPathOp = operation.endsWith('Path');
    if (isPathOp) operation = operation.replace('Path', '');
    const opArg = rest[operation];
    let comparisonValue;
    if (isPathOp) {
        if (!opArg.startsWith('$')) throw new Error('Path operations must start with $');
        comparisonValue = opArg === '$'
            ? data
            : JSONPathQuery(opArg, data);
    } else {
        comparisonValue = opArg;
    }
    const variableValue = Variable === '$'
        ? data
        : JSONPathQuery(Variable, data);
    return operations[operation](variableValue, comparisonValue);
}

function applyRule(r, data) {
    let { Next, ...rule } = r;
    if (rule.Variable) return applyComparison(rule, data);
    const withAppliedComparisons = Object.entries(rule)
        .reduce((acc, [ key, value ]) =>
            Array.isArray(value)
                ? value.map(v => applyRule(v, data))
                : applyRule(value, data),
            null);
    const operation = Object.keys(rule).shift();
    return operations[operation](withAppliedComparisons);
}

export function findChoice(choices = [], data) {
    return choices.find(choice => applyRule(choice, data));
}
