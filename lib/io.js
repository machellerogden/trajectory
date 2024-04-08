import { JSONPath } from 'jsonpath-plus';

export function JSONPathParts(path) {
    try {
        const parts = JSONPath.toPathArray(path);
        parts.shift(); // remove '$'
        return parts;
    } catch (error) {
        throw new Error(`JSONPath Error: ${error}`);
    }
}

export function JSONPathQuery(path, json) {
    let value;
    try {
        value = JSONPath({ path, json }).shift();
    } catch (error) {
        throw new Error(`JSONPath Error: ${error}`);
    }
    return value;
}

function reduceAny(value, fn) {
    if (value == null || typeof value !== 'object') return value;
    return Array.isArray(value)
        ? value.reduce((acc, v, i) => fn(acc, v, i), [])
        : Object.entries(value).reduce((acc, [ k, v ]) => fn(acc, v, k), {});
}

function applyDataToTemplate(data, result = {}, key, value, recur) {
    if (typeof value === 'string' && value.startsWith('$')) {
        value = value === '$'         ? data
              : value.startsWith('$') ? JSONPathQuery(value, data)
              :                         value;
    }
    if (typeof key === 'string' && key.endsWith('.$')) {
        result[key.slice(0, -2)] = value;
    } else {
        result[key] =
            value != null && typeof value === 'object'
                ? recur(value)
                : value;
    }
    return result;
}

export function applyDataTemplate(template, data) {
    if (template == null) return data;

    const recur = value =>
        reduceAny(value, (result, v, k) =>
            applyDataToTemplate(data, result, k, v, recur));

    return recur(template);
}

export function applyPath(path, data) {
    if (path == null) return data;

    return JSONPathQuery(path, data);
}

export function assocPath(path, input, result) {
    if (path == null) return result;

    const parts = JSONPathParts(path);
    if (parts.length === 0) return result;

    const output = input;
    let cursor = output;
    while (parts.length > 2) {
        const key = parts.shift();
        cursor = cursor[key];
    }
    cursor[parts.shift()] = result;

    return output;
}
