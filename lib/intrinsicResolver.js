import { intrinsics } from './intrinsics.js';
import { JSONPathQuery } from './io.js';
import { tokenizeArgs } from './tokenizer.js';

export function resolveIntrinsic(expression, context, data, depth = 0) {
    if (typeof expression !== 'string') {
        throw new Error('resolveIntrinsic: Expression must be a string.');
    }

    // Prevent infinite recursion by limiting depth
    if (depth > 10) {
        throw new Error('resolveIntrinsic: Exceeded maximum intrinsic function nesting depth (10).');
    }

    // Match intrinsic function syntax: States.FunctionName(arg1, arg2, ...)
    const intrinsicRegex = /^States\.(\w+)\((.*)\)$/s;
    const match = expression.match(intrinsicRegex);

    if (!match) {
        throw new Error(`resolveIntrinsic: Invalid intrinsic function format: ${expression}`);
    }

    const [_, functionName, rawArgs] = match;

    // Check if the intrinsic function exists
    if (!intrinsics[`States.${functionName}`]) {
        throw new Error(`resolveIntrinsic: Unsupported intrinsic function: States.${functionName}`);
    }

    // Tokenize arguments and resolve recursively
    const args = tokenizeArgs(rawArgs).map(arg => {
        if (arg.startsWith('States.')) {
            // Recursively resolve nested intrinsic functions
            return resolveIntrinsic(arg, context, data, depth + 1);
        } else if (arg.startsWith('$$.')) {
            // Resolve against context
            return JSONPathQuery(arg.slice(1), context);
        } else if (arg.startsWith('$.')) {
            // Resolve against data
            return JSONPathQuery(arg, data);
        }

        // Parse literals (e.g., numbers, strings, booleans)
        try {
            return JSON.parse(arg);
        } catch {
            // Assume raw string if parsing fails
            return arg.replace(/^['"]|['"]$/g, ''); // Remove quotes
        }
    });

    // Call the intrinsic function with resolved arguments
    try {
        return intrinsics[`States.${functionName}`](...args);
    } catch (error) {
        throw new Error(`resolveIntrinsic: Error in States.${functionName}: ${error.message}`);
    }
}
