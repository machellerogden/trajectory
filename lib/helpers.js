'use strict';

const endStates = new Set([ 'Succeed', 'Fail']);
const isEnd = exports.isEnd = state => state.End || endStates.has(state.Type);
const FindError = exports.FindError = error => r => r.ErrorEquals.reduce((acc, v) => acc || v === error.name || v === 'States.ALL', false);

function* abort(name, state, emit) {
    const { Type, Error:error, Cause:cause } = state;
    const data = { name, error, cause };
    const errMsg = [];
    if (error) errMsg.push(error);
    if (cause) errMsg.push(cause);
    yield { name, data };
    emit({ type: Type.toLowerCase(), name, data });
    throw new Error(errMsg.join(': '));
}

exports.abort = abort;
