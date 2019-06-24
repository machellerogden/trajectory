'use strict';

const sleep = seconds =>
    new Promise(resolve =>
        setTimeout(resolve, seconds * 1000));

function reduceAny(value, fn) {
    if (value == null || typeof value !== 'object') return value;
    return Array.isArray(value)
        ? value.reduce((acc, v, i) => fn(acc, v, i), [])
        : Object.entries(value).reduce((acc, [ k, v ]) => fn(acc, v, k), {});
}

module.exports = { sleep, reduceAny };
