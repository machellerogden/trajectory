import { test } from 'zora';
import { executeMachine } from '../index.js';
import { STATE, ERROR } from '../lib/constants.js';

test('Task State - Basic Execution', async (assert) => {
    const machine = {
        "StartAt": "TaskState",
        "States": {
            "TaskState": {
                "Type": "Task",
                "Resource": "add",
                "Parameters": {
                    "a": 1,
                    "b": 2
                },
                "End": true
            }
        }
    };

    const handlers = {
        add: ({ a, b }) => a + b
    };

    const context = {
        handlers,
        quiet: true
    };

    const input = {};

    const [ status, output ] = await executeMachine(machine, context, input);

    assert.is(status, STATE.SUCCEEDED);
    assert.equal(output, 3);
});

test('Task State - Error Handling', async (assert) => {
    const machine = {
        "StartAt": "TaskState",
        "States": {
            "TaskState": {
                "Type": "Task",
                "Resource": "throwError",
                "End": true
            }
        }
    };

    const handlers = {
        throwError: () => { throw new Error('Test error'); }
    };

    const context = {
        handlers,
        quiet: true
    };

    const input = {};

    const [ status, output ] = await executeMachine(machine, context, input);

    assert.is(status, STATE.FAILED);
    assert.equal(output.message, 'Test error');
});

test('Task State - Retry Mechanism', async (assert) => {
    const machine = {
        "StartAt": "TaskState",
        "States": {
            "TaskState": {
                "Type": "Task",
                "Resource": "throwError",
                "Retry": [{
                    "ErrorEquals": ["Error"],
                    "IntervalSeconds": 1,
                    "MaxAttempts": 3
                }],
                "End": true
            }
        }
    };

    let attempt = 0;

    const handlers = {
        throwError: () => {
            attempt++;
            if (attempt < 3) throw new Error('Test error');
            return 'Success';
        }
    };

    const context = {
        handlers,
        quiet: true
    };

    const input = {};

    const [ status, output ] = await executeMachine(machine, context, input);

    assert.is(status, STATE.SUCCEEDED);
    assert.equal(output, 'Success');
    assert.equal(attempt, 3);

});

test('Task State - Catch Mechanism', async (assert) => {
    const machine = {
        "StartAt": "TaskState",
        "States": {
            "TaskState": {
                "Type": "Task",
                "Resource": "throwError",
                "Catch": [{
                    "ErrorEquals": ["Error"],
                    "Next": "FallbackState"
                }],
                "End": true
            },
            "FallbackState": {
                "Type": "Pass",
                "Result": { "foo": "bar" },
                "End": true
            }
        }
    };

    const handlers = {
        throwError: () => { throw new Error('Test error'); }
    };

    const context = {
        handlers,
        quiet: true
    };

    const input = {};

    const [ status, output ] = await executeMachine(machine, context, input);

    assert.is(status, STATE.SUCCEEDED);
    assert.equal(output, { foo: 'bar' });
});

test('Task State - Timeout Handling', async (assert) => {
    const machine = {
        "StartAt": "TaskState",
        "States": {
            "TaskState": {
                "Type": "Task",
                "Resource": "longRunningTask",
                "TimeoutSeconds": 1,
                "End": true
            }
        }
    };

    const handlers = {
        longRunningTask: () => new Promise(resolve => setTimeout(() => resolve('Success'), 2000))
    };

    const context = {
        handlers,
        quiet: true
    };

    const input = {};

    const [ status, output ] = await executeMachine(machine, context, input);

    assert.is(status, STATE.FAILED);
    assert.is(output.name, ERROR.States_Timeout);
});
