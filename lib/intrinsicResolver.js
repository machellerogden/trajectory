import { intrinsics } from './intrinsics.js';
import { JSONPathQuery } from './io.js';
import { tokenizeArgs } from './tokenizer.js';
import { createStatesError } from './errors.js';
import { ERROR } from './constants.js';

export function resolveIntrinsic(expression, context, data, depth = 0) {
    if (typeof expression !== 'string') {
        throw createStatesError(ERROR.States.IntrinsicFailure, 'Expression must be a string.');
    }

    // Prevent infinite recursion by limiting depth
    if (depth > 10) {
        throw createStatesError(ERROR.States.IntrinsicFailure, 'Exceeded maximum intrinsic function nesting depth (10).');
    }

    // Match intrinsic function syntax: States.FunctionName(arg1, arg2, ...)
    const intrinsicRegex = /^States\.(\w+)\((.*)\)$/s;
    const match = expression.match(intrinsicRegex);

    if (!match) {
        throw createStatesError(ERROR.States.IntrinsicFailure, `Invalid intrinsic function format: ${expression}`);
    }

    const [_, functionName, rawArgs] = match;

    // Check if the intrinsic function exists
    if (!intrinsics[`States.${functionName}`]) {
        throw createStatesError(ERROR.States.IntrinsicFailure, `Unsupported intrinsic function: States.${functionName}`);
    }

    // Tokenize arguments and resolve recursively
    const args = tokenizeArgs(rawArgs).map(arg => {
        if (arg.startsWith('States.')) {
            // Recursively resolve nested intrinsic functions
            return resolveIntrinsic(arg, context, data, depth + 1);
        } else if (arg.startsWith('$$.')) {
            // Resolve against context
            try {
                return JSONPathQuery(arg.slice(1), context);
            } catch (error) {
                throw createStatesError(ERROR.States.QueryEvaluationError,
                    `Failed to evaluate context path ${arg}: ${error.message}`
                );
            }
        } else if (arg.startsWith('$.')) {
            // Resolve against data
            try {
                return JSONPathQuery(arg, data);
            } catch (error) {
                throw createStatesError(ERROR.States.QueryEvaluationError,
                    `Failed to evaluate data path ${arg}: ${error.message}`
                );
            }
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
        throw createStatesError(ERROR.States.IntrinsicFailure,
            `Error in States.${functionName}: ${error.message}`,
            error
        );
    }
}
