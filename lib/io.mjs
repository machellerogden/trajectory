'use strict';

import JSONPath from 'jsonpath';
import set from 'lodash/set';
import compose from 'lodash/fp/compose';

import { reduceAny } from './util';

export function asPath(referencePath) {
    const {
        groups: {
            path = referencePath
        } = {}
    } = referencePath.match(/^\$[\.]?(?<path>.*)/) || {};
    return path;
}

function applyDataToParameters(data, result = {}, key, value, recur) {
    if (key.endsWith('.$')) {
        result[key.slice(0, -2)] =
            value === '$'       ? data
          : value.includes('$') ? JSONPath.query(data, value).shift()
          : /* default */         value;
    } else {
        result[key] =
            value != null && typeof value === 'object' ? recur(value)
          : /* default */                                value;
    }
    return result;
}

export function IOCtrl({ getState, getIO, cc }) {

    function applyParameters(data) {
        const state = getState();
        if (state.Parameters == null) return data;
        const recur = value =>
            reduceAny(value, (result, v, k) =>
                applyDataToParameters(data, result, k, v, recur));
        return recur(state.Parameters);
    }

    function fromInput(data) {
        const state = getState();
        if (state.InputPath == null) return data;
        return JSONPath.query(data, state.InputPath).shift();
    }

    async function fromOutput(data) {
        const state = getState();
        if (state.OutputPath == null) return data;
        return JSONPath.query(await data, state.OutputPath).shift();
    }

    async function toResult(value) {
        const state = getState();
        if (state.Result) return state.Result;
        const v = await value;
        if (state.ResultPath == null || state.ResultPath === '$') return v;
        return set(getIO(), asPath(state.ResultPath), v);
    }

    async function delayOutput(data) {
        const state = getState();
        const seconds = (state.Seconds != null)
            ? state.Seconds
            : (state.SecondsPath != null)
                ? JSONPath.query(data, state.SecondsPath)
                : null;
        if (typeof seconds !== 'number') {
            const msg = `SecondsPath on state "${name}" resolves to "${seconds}". Must be a number.`; 
            throw new Error(msg);
        }
        await cc.CancellableTimeout(seconds * 1000);
        return data;
    }

    const processInput = compose(applyParameters, fromInput);
    const processOutput = compose(fromOutput, toResult);
    const processIO = compose(processOutput, processInput)

    return {
        applyParameters,
        fromInput,
        fromOutput,
        toResult,
        delayOutput,
        processInput,
        processOutput,
        processIO
    };
}
