import { test } from 'zora';
import { executeMachine } from '../index.js';
import { STATE, ERROR } from '../lib/constants.js';

test('Error Preservation - Stack Trace and Properties', async (assert) => {
    const machine = {
        "StartAt": "TaskState",
        "States": {
            "TaskState": {
                "Type": "Task",
                "Resource": "throwCustomError",
                "End": true
            }
        }
    };

    // Create a custom error with properties
    class CustomError extends Error {
        constructor(message) {
            super(message);
            this.name = 'CustomError';
            this.customProperty = 'test-value';
            this.code = 'ERR_CUSTOM';
        }
    }

    const handlers = {
        throwCustomError: () => {
            const error = new CustomError('This is a custom error');
            throw error;
        }
    };

    const context = {
        handlers,
        quiet: true
    };

    const input = {};

    const [ status, output ] = await executeMachine(machine, context, input);

    assert.is(status, STATE.FAILED);
    assert.equal(output.name, ERROR.States.TaskFailed);
    assert.ok(output.message.includes('This is a custom error'));
    
    // Check that original error properties are preserved
    assert.equal(output.customProperty, 'test-value');
    assert.equal(output.code, 'ERR_CUSTOM');
    
    // Check that stack trace is preserved
    assert.ok(output.stack.includes('CustomError'));
    
    // Check that cause is set to the original error
    assert.equal(output.cause.name, 'CustomError');
});

test('Error Preservation - Nested Errors', async (assert) => {
    const machine = {
        "StartAt": "TaskState",
        "States": {
            "TaskState": {
                "Type": "Task",
                "Resource": "throwNestedError",
                "End": true
            }
        }
    };

    const handlers = {
        throwNestedError: () => {
            try {
                // Create a deep error chain
                try {
                    throw new TypeError('Original type error');
                } catch (innerError) {
                    throw new RangeError('Middle range error: ' + innerError.message);
                }
            } catch (outerError) {
                throw new Error('Outer error: ' + outerError.message);
            }
        }
    };

    const context = {
        handlers,
        quiet: true
    };

    const input = {};

    const [ status, output ] = await executeMachine(machine, context, input);

    assert.is(status, STATE.FAILED);
    assert.equal(output.name, ERROR.States.TaskFailed);
    assert.ok(output.message.includes('Outer error'));
    
    // Check that the original error's stack is preserved
    assert.ok(output.stack.includes('throwNestedError'));
    
    // Check that cause chain is preserved
    assert.equal(output.cause.name, 'Error');
    assert.ok(output.cause.message.includes('Outer error'));
});
