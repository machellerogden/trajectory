import crypto from 'node:crypto';

export const intrinsics = {
    /**
     * Creates an array from arguments
     */
    'States.Array': (...args) => args,

    /**
     * Splits an array into chunks of a specified size
     */
    'States.ArrayPartition': (array, chunkSize) => {
        if (!Array.isArray(array)) throw new Error('States.ArrayPartition: Input must be an array.');
        if (typeof chunkSize !== 'number' || chunkSize <= 0) {
            throw new Error('States.ArrayPartition: Chunk size must be a positive number.');
        }

        const result = [];
        for (let i = 0; i < array.length; i += chunkSize) {
            result.push(array.slice(i, i + chunkSize));
        }
        return result;
    },

    /**
     * Checks if a value exists in an array
     */
    'States.ArrayContains': (array, value) => {
        if (!Array.isArray(array)) throw new Error('States.ArrayContains: Input must be an array.');
        return array.includes(value);
    },

    /**
     * Creates an array from a range of numbers
     */
    'States.ArrayRange': (start, end, step = 1) => {
        if (typeof start !== 'number' || typeof end !== 'number' || typeof step !== 'number' || step <= 0) {
            throw new Error('States.ArrayRange: Inputs must be positive numbers.');
        }
        const result = [];
        for (let i = start; i <= end; i += step) {
            result.push(i);
        }
        return result;
    },

    /**
     * Gets the element at a specific index in an array
     */
    'States.ArrayGetItem': (array, index) => {
        if (!Array.isArray(array)) throw new Error('States.ArrayGetItem: Input must be an array.');
        if (typeof index !== 'number' || index < 0 || index >= array.length) {
            throw new Error('States.ArrayGetItem: Index out of bounds.');
        }
        return array[index];
    },

    /**
     * Returns the length of an array
     */
    'States.ArrayLength': (array) => {
        if (!Array.isArray(array)) throw new Error('States.ArrayLength: Input must be an array.');
        return array.length;
    },

    /**
     * Removes duplicate elements from an array
     */
    'States.ArrayUnique': (array) => {
        if (!Array.isArray(array)) throw new Error('States.ArrayUnique: Input must be an array.');
        return [...new Set(array)];
    },

    /**
     * Encodes a string to Base64
     */
    'States.Base64Encode': (str) => {
        if (typeof str !== 'string') throw new Error('States.Base64Encode: Input must be a string.');
        return Buffer.from(str, 'utf-8').toString('base64');
    },

    /**
     * Decodes a Base64 string
     */
    'States.Base64Decode': (base64Str) => {
        if (typeof base64Str !== 'string') throw new Error('States.Base64Decode: Input must be a string.');
        return Buffer.from(base64Str, 'base64').toString('utf-8');
    },

    /**
     * Calculates the hash of a given input string using the specified algorithm.
     */
    'States.Hash': (data, algorithm) => {
        if (typeof data !== 'string') throw new Error('States.Hash: Input must be a string.');
        if (typeof algorithm !== 'string') throw new Error('States.Hash: Algorithm must be a string.');

        const supportedAlgorithms = ['MD5', 'SHA-1', 'SHA-256', 'SHA-384', 'SHA-512'];
        if (!supportedAlgorithms.includes(algorithm.toUpperCase())) {
            throw new Error(`States.Hash: Unsupported algorithm. Supported algorithms are: ${supportedAlgorithms.join(', ')}`);
        }

        return crypto.createHash(algorithm.toLowerCase()).update(data).digest('hex');
    },

    /**
     * Merges two JSON objects into one.
     * Note: Only shallow merging is supported.
     */
    'States.JsonMerge': (json1, json2, deepMerge = false) => {
        if (typeof json1 !== 'object' || typeof json2 !== 'object') {
            throw new Error('States.JsonMerge: Both inputs must be JSON objects.');
        }
        if (deepMerge) {
            throw new Error('States.JsonMerge: Deep merging is not supported.');
        }
        return { ...json1, ...json2 };
    },

    /**
     * Converts a JSON string to a JSON object.
     */
    'States.StringToJson': (jsonString) => {
        if (typeof jsonString !== 'string') {
            throw new Error('States.StringToJson: Input must be a string.');
        }
        try {
            return JSON.parse(jsonString);
        } catch (error) {
            throw new Error('States.StringToJson: Invalid JSON string.');
        }
    },

    /**
     * Converts a JSON object to a JSON string.
     */
    'States.JsonToString': (jsonObject) => {
        if (typeof jsonObject !== 'object') {
            throw new Error('States.JsonToString: Input must be a JSON object.');
        }
        try {
            return JSON.stringify(jsonObject);
        } catch (error) {
            throw new Error('States.JsonToString: Failed to convert JSON object to string.');
        }
    },

    /**
     * Adds two numbers.
     */
    'States.MathAdd': (value1, value2) => {
        if (typeof value1 !== 'number' || typeof value2 !== 'number') {
            throw new Error('States.MathAdd: Both inputs must be numbers.');
        }
        return value1 + value2;
    },

    /**
     * Generates a random number between start (inclusive) and end (exclusive).
     */
    'States.MathRandom': (start, end) => {
        if (typeof start !== 'number' || typeof end !== 'number' || start >= end) {
            throw new Error('States.MathRandom: Start and end must be numbers, with start < end.');
        }
        return Math.floor(Math.random() * (end - start) + start);
    },

    /**
     * Generates a version 4 UUID.
     */
    'States.UUID': () => crypto.randomUUID(),

    /**
     * Constructs a formatted string with interpolated values.
     */
    'States.Format': (template, ...values) => {
        if (typeof template !== 'string') {
            throw new Error('States.Format: Template must be a string.');
        }
        return template.replace(/\{\}/g, () => {
            if (values.length === 0) {
                throw new Error('States.Format: Not enough values provided for placeholders.');
            }
            return values.shift();
        });
    },

    /**
     * Splits a string into an array of substrings using a specified delimiter.
     */
    'States.StringSplit': (inputString, delimiter) => {
        if (typeof inputString !== 'string') {
            throw new Error('States.StringSplit: Input must be a string.');
        }
        if (typeof delimiter !== 'string') {
            throw new Error('States.StringSplit: Delimiter must be a string.');
        }
        return inputString.split(delimiter);
    },
};
