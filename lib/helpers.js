'use strict';

const JSONPath = require('jsonpath');

const endStates = new Set([ 'succeed', 'fail']);
const isEnd = state => state.end || endStates.has(state.type);

function applyDataToParameters(data, result = {}, key, value, recur) {
    if (key.endsWith('.$')) {
        result[key.slice(0, -2)] = JSONPath.query(data, value).shift();
    } else {
        result[key] = recur(value[key]);
    }
    return result;
}

module.exports = { isEnd, applyDataToParameters };
