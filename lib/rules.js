'use strict';

const JSONPath = require('jsonpath');

const operations = {
    BooleanEquals: (a, b) => a === b,
    NumericEquals: (a, b) => a === b,
    NumericGreaterThan: (a, b) => a > b,
    NumericGreaterThanEquals: (a, b) => a >= b,
    NumericLessThan: (a, b) => a < b,
    NumericLessThanEquals: (a, b) => a <= b,
    StringEquals: (a, b) => a === b,
    StringGreaterThan: (a, b) => typeof a === 'string' && a.localeCompare(b) > 0,
    StringGreaterThanEquals: (a, b) => typeof a === 'string' && a.localeCompare(b) >= 0,
    StringLessThan: (a, b) => typeof a === 'string' && a.localeCompare(b) < 0,
    StringLessThanEquals: (a, b) => typeof a === 'string' && a.localeCompare(b) <= 0,
    TimestampEquals: (a, b) => (new Date(a)).getTime() === (new Date(b)).getTime(),
    TimestampGreaterThan: (a, b) => new Date(a) > new Date(b),
    TimestampGreaterThanEquals: (a, b) => new Date(a) >= new Date(b),
    TimestampLessThan: (a, b) => new Date(a) < new Date(b),
    TimestampLessThanEquals: (a, b) => new Date(a) <= new Date(b),
    And: a => a.every(v => v === true),
    Or: a => a.some(v => v === true),
    Not: a => !a
};

function applyComparison(rule, io) {
    const { Variable, ...rest } = rule;
    const value = Variable === '$'
        ? io
        : JSONPath.query(io, Variable).shift();
    const operation = Object.keys(rest).shift();
    const comparisonValue = rest[operation];
    return operations[operation](value, comparisonValue);
}

function applyRule(r, io) {
    let { Next, ...rule } = r;
    if (rule.Variable) return applyComparison(rule, io);
    const withAppliedComparisons = Object.entries(rule)
        .reduce((acc, [ key, value ]) =>
            Array.isArray(value)
                ? value.map(v => applyRule(v, io))
                : applyRule(value, io),
            null);
    const operation = Object.keys(rule).shift();
    return operations[operation](withAppliedComparisons);
}

function findChoice(choices = [], io) {
    return choices.find(choice => applyRule(choice, io));
}

module.exports = {
    findChoice
};
