'use strict';

const terminalStates = new Set([ 'succeed', 'fail']);
const isTerminal = state => state.end || terminalStates.has(state.type);

module.exports = { isTerminal };
