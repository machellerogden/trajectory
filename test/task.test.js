import { test } from 'zora';
import { executeMachine } from '../index.js';
import { STATE, ERROR } from '../lib/constants.js';
import { StatesError } from '../lib/errors.js';

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
        throwError: () => { throw new StatesError(ERROR.States.TaskFailed, 'Test error'); }
    };

    const context = {
        handlers,
        quiet: true
    };

    const input = {};

    const [ status, output ] = await executeMachine(machine, context, input);

    assert.is(status, STATE.FAILED);
    assert.equal(output.name, ERROR.States.TaskFailed);
});

test('Task State - Retry Mechanism', async (assert) => {
    const machine = {
        "StartAt": "TaskState",
        "States": {
            "TaskState": {
                "Type": "Task",
                "Resource": "throwError",
                "Retry": [{
                    "ErrorEquals": [ERROR.States.TaskFailed],
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
            if (attempt < 3) throw new StatesError(ERROR.States.TaskFailed, 'Test error');
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
                    "ErrorEquals": [ERROR.States.TaskFailed],
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
        throwError: () => { throw new StatesError(ERROR.States.TaskFailed, 'Test error'); }
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

test('Task State - Catch Mechanism - States.ALL', async (assert) => {
    const machine = {
        "StartAt": "TaskState",
        "States": {
            "TaskState": {
                "Type": "Task",
                "Resource": "throwError",
                "Catch": [{
                    "ErrorEquals": ["Expected Error"],
                    "Next": "ExpectedErrorState"
                },{
                    "ErrorEquals": [ERROR.States.ALL],
                    "Next": "FallbackState"
                }],
                "End": true
            },
            "ExpectedErrorState": {
                "Type": "Pass",
                "Result": { "pass": false },
                "End": true
            },
            "FallbackState": {
                "Type": "Pass",
                "Result": { "pass": true },
                "End": true
            }
        }
    };

    const handlers = {
        throwError: () => { throw new StatesError(ERROR.States.TaskFailed, 'Surprise Error'); }
    };

    const context = {
        handlers,
        quiet: true
    };

    const input = {};

    const [ status, output ] = await executeMachine(machine, context, input);

    assert.is(status, STATE.SUCCEEDED);
    assert.equal(output, { pass: true });
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
    assert.equal(output.name, ERROR.States.Timeout);
    assert.ok(output.message.includes('Task timed out'));
});
