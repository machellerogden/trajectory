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

function isPromise(obj) {
    return !!obj &&
        (typeof obj === 'object' || typeof obj === 'function') &&
        typeof obj.then === 'function';
}

function isReadableStream(stream) {
    return stream !== null &&
        typeof stream === 'object' &&
        typeof stream.pipe === 'function' &&
        stream.readable !== false &&
        typeof stream._read === 'function' &&
        typeof stream._readableState === 'object';
}

module.exports = {
    sleep,
    reduceAny,
    isPromise,
    isReadableStream
};
