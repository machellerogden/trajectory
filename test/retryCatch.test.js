import { test } from 'zora';
import { executeMachine } from '../index.js';
import { STATE } from '../lib/constants.js';

test('Retry with multiple blocks - partial match', async (assert) => {
    let attemptsForNetworkError = 0;
    let attemptsForGenericError = 0;

    const machine = {
        "StartAt": "TaskState",
        "States": {
            "TaskState": {
                "Type": "Task",
                "Resource": "unstableTask",
                "Retry": [
                    {
                        "ErrorEquals": ["NetworkError"],
                        "IntervalSeconds": 0,     // zero for faster test
                        "BackoffRate": 1,        // no backoff
                        "MaxAttempts": 2
                    },
                    {
                        "ErrorEquals": ["Error", "States.ALL"],
                        "IntervalSeconds": 0,
                        "BackoffRate": 1,
                        "MaxAttempts": 3
                    }
                ],
                "Catch": [
                    {
                        "ErrorEquals": ["SpecificError"],
                        "Next": "FallbackState"
                    },
                    {
                        "ErrorEquals": ["States.ALL"],
                        "Next": "AllErrorState"
                    }
                ],
                "End": true
            },
            "FallbackState": {
                "Type": "Pass",
                "Result": "Fallback",
                "End": true
            },
            "AllErrorState": {
                "Type": "Pass",
                "Result": "Caught by ALL",
                "End": true
            }
        }
    };

    const handlers = {
        unstableTask: () => {
            // We'll simulate the first throw = "NetworkError"
            // second throw = "Error" (generic)
            // third throw = success
            // This allows us to see the first Retry block matching "NetworkError",
            // then the second Retry block matching "Error".
            if (attemptsForNetworkError === 0) {
                attemptsForNetworkError++;
                const err = new Error('Connection lost');
                err.name = 'NetworkError';
                throw err;
            } else if (attemptsForGenericError === 0) {
                attemptsForGenericError++;
                const err = new Error('Generic Explosion');
                err.name = 'Error';
                throw err;
            } else {
                return 'Success on third try!';
            }
        }
    };

    const context = { handlers, quiet: true };

    const [status, output] = await executeMachine(machine, context, {});

    // Should succeed on third attempt
    assert.equal(status, STATE.SUCCEEDED, 'State machine should eventually succeed');
    assert.equal(output, 'Success on third try!', 'The final output should come from the successful Task execution');
    assert.equal(attemptsForNetworkError, 1, 'NetworkError thrown once');
    assert.equal(attemptsForGenericError, 1, 'Generic error thrown once');
});

test('Multiple Retry blocks - exceed first block attempts => fallback to catch', async (assert) => {
    let attempts = 0;

    const machine = {
        "StartAt": "FailingTask",
        "States": {
            "FailingTask": {
                "Type": "Task",
                "Resource": "alwaysFail",
                "Retry": [
                    {
                        "ErrorEquals": ["MyError"],
                        "IntervalSeconds": 0,
                        "BackoffRate": 1,
                        "MaxAttempts": 2
                    },
                    {
                        "ErrorEquals": ["States.ALL"],
                        "IntervalSeconds": 0,
                        "BackoffRate": 1,
                        "MaxAttempts": 1
                    }
                ],
                "Catch": [
                    {
                        "ErrorEquals": ["States.ALL"],
                        "Next": "CaughtState"
                    }
                ],
                "End": true
            },
            "CaughtState": {
                "Type": "Pass",
                "Result": "Caught after retries",
                "End": true
            }
        }
    };

    const handlers = {
        alwaysFail: () => {
            attempts++;
            const err = new Error('Something failed');
            err.name = 'MyError';
            throw err;
        }
    };

    const context = { handlers, quiet: true };

    const [status, output] = await executeMachine(machine, context, {});
    assert.equal(status, STATE.SUCCEEDED, 'Eventually transitions to the Catch state');
    assert.equal(output, 'Caught after retries');
    // Attempt logic:
    //  - We match MyError on the first retry block => max 2 attempts
    //  - We exceed that => we do *not* fall back to second block for the same error
    //  - Then we go to Catch
    assert.equal(attempts, 2, 'Should only attempt the first block’s MaxAttempts (2) then go to catch');
});

test('No matching Retry => immediate Catch', async (assert) => {
    let attempts = 0;
    const machine = {
        "StartAt": "FailingTask",
        "States": {
            "FailingTask": {
                "Type": "Task",
                "Resource": "failWithUnknownError",
                "Retry": [
                    {
                        "ErrorEquals": ["KnownError"],
                        "MaxAttempts": 3
                    }
                ],
                "Catch": [
                    {
                        "ErrorEquals": ["States.ALL"],
                        "Next": "CatchState"
                    }
                ],
                "End": true
            },
            "CatchState": {
                "Type": "Pass",
                "Result": "Caught unknown error",
                "End": true
            }
        }
    };

    const handlers = {
        failWithUnknownError: () => {
            attempts++;
            const err = new Error('Surprise error');
            err.name = 'Surprise';
            throw err;
        }
    };

    const context = { handlers, quiet: true };

    const [status, output] = await executeMachine(machine, context, {});
    assert.equal(status, STATE.SUCCEEDED, 'Machine ends up in the Catch path');
    assert.equal(output, 'Caught unknown error');
    assert.equal(attempts, 1, 'Should fail immediately without retry, because no Retry rule matches Surprise');
});

test('If final Retry also fails => check Catch => fail machine if no Catch', async (assert) => {
    let attempts = 0;
    const machine = {
        "StartAt": "NoCatchTask",
        "States": {
            "NoCatchTask": {
                "Type": "Task",
                "Resource": "alwaysFail",
                "Retry": [
                    {
                        "ErrorEquals": ["States.ALL"],
                        "MaxAttempts": 2,
                        "IntervalSeconds": 0
                    }
                ],
                "End": true
            }
        }
    };

    const handlers = {
        alwaysFail: () => {
            attempts++;
            throw new Error('Uncaught error');
        }
    };

    const context = { handlers, quiet: true };

    const [status, output] = await executeMachine(machine, context, {});
    assert.equal(status, 'FAILED', 'Machine should fail if no catch after exhausting retries');
    assert.equal(output.message, 'Uncaught error');
    assert.equal(attempts, 2, 'Handler is attempted up to MaxAttempts=2');
});
