'use strict';

const endStates = new Set([ 'succeed', 'fail']);
const isEnd = state => state.end || endStates.has(state.type);

module.exports = { isEnd };
