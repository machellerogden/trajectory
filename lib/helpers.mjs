'use strict';

const endStates = new Set([ 'Succeed', 'Fail']);
export const isEnd = state => state.End || endStates.has(state.Type);
export const FindError = error => r => r.ErrorEquals.reduce((acc, v) => acc || v === error.name || v === 'States.ALL', false);

export function* abort(name, state, emit) {
    const { Type, Error:error, Cause:cause } = state;
    const data = { name, error, cause };
    const errMsg = [];
    if (error) errMsg.push(error);
    if (cause) errMsg.push(cause);
    yield { name, data };
    emit({ type: Type.toLowerCase(), name, data });
    throw new Error(errMsg.join(': '));
}
