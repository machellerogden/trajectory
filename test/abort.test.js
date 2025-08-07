import { test } from 'zora';
import { executeMachine } from '../index.js';
import { STATE } from '../lib/constants.js';

test('AbortController - Task State Cancellation', async (assert) => {
    const machine = {
        "StartAt": "LongTask",
        "States": {
            "LongTask": {
                "Type": "Task",
                "Resource": "longRunningTask",
                "End": true
            }
        }
    };

    let taskStarted = false;
    let taskCompleted = false;

    const handlers = {
        longRunningTask: async (input, context) => {
            taskStarted = true;
            // Simulate a long-running task
            await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    taskCompleted = true;
                    resolve('Success');
                }, 1000);

                if (context.signal) {
                    context.signal.addEventListener('abort', () => {
                        clearTimeout(timeout);
                        reject(new Error('Task aborted'));
                    });
                }
            });
        }
    };

    const context = {
        handlers,
        quiet: true
    };

    const controller = new AbortController();

    // Add signal to context
    context.signal = controller.signal;

    // Start the execution
    const executionPromise = executeMachine(machine, context, {});

    // Cancel after 100ms
    setTimeout(() => controller.abort(), 100);

    const [status, output] = await executionPromise;

    assert.is(status, STATE.FAILED);
    assert.ok(taskStarted, 'Task should have started');
    assert.notOk(taskCompleted, 'Task should not have completed');
    // Check both potential error formats
    const errorMessage = output.message || (output.error && output.error.message) || '';
    assert.ok(errorMessage.includes('aborted') || errorMessage.includes('Task execution aborted'), 'Error should indicate abortion');
});

test('AbortController - Parallel State Cancellation', async (assert) => {
    const machine = {
        "StartAt": "ParallelTasks",
        "States": {
            "ParallelTasks": {
                "Type": "Parallel",
                "Branches": [
                    {
                        "StartAt": "Branch1",
                        "States": {
                            "Branch1": {
                                "Type": "Task",
                                "Resource": "slowTask1",
                                "End": true
                            }
                        }
                    },
                    {
                        "StartAt": "Branch2",
                        "States": {
                            "Branch2": {
                                "Type": "Task",
                                "Resource": "slowTask2",
                                "End": true
                            }
                        }
                    }
                ],
                "End": true
            }
        }
    };

    let task1Started = false;
    let task2Started = false;
    let task1Completed = false;
    let task2Completed = false;

    const handlers = {
        slowTask1: async (input, context) => {
            task1Started = true;
            return new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    task1Completed = true;
                    resolve('Task 1 complete');
                }, 1000);

                if (context.signal) {
                    const abortHandler = () => {
                        clearTimeout(timeout);
                        reject(new Error('Task 1 aborted'));
                    };
                    context.signal.addEventListener('abort', abortHandler);
                    // Check if already aborted
                    if (context.signal.aborted) {
                        abortHandler();
                    }
                }
            });
        },
        slowTask2: async (input, context) => {
            task2Started = true;
            return new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    task2Completed = true;
                    resolve('Task 2 complete');
                }, 1000);

                if (context.signal) {
                    const abortHandler = () => {
                        clearTimeout(timeout);
                        reject(new Error('Task 2 aborted'));
                    };
                    context.signal.addEventListener('abort', abortHandler);
                    // Check if already aborted
                    if (context.signal.aborted) {
                        abortHandler();
                    }
                }
            });
        }
    };

    const context = {
        handlers,
        quiet: true
    };

    const controller = new AbortController();
    context.signal = controller.signal;
    const executionPromise = executeMachine(machine, context, {});

    // Cancel after 100ms
    setTimeout(() => controller.abort(), 100);

    const [status, output] = await executionPromise;

    assert.is(status, STATE.FAILED);
    assert.ok(task1Started || task2Started, 'At least one task should have started');
    assert.notOk(task1Completed && task2Completed, 'Tasks should not have completed');
});

test('AbortController - Map State Cancellation', async (assert) => {
    const machine = {
        "StartAt": "MapTasks",
        "States": {
            "MapTasks": {
                "Type": "Map",
                "ItemsPath": "$.items",
                "MaxConcurrency": 2,
                "ItemProcessor": {
                    "StartAt": "ProcessItem",
                    "States": {
                        "ProcessItem": {
                            "Type": "Task",
                            "Resource": "processItem",
                            "End": true
                        }
                    }
                },
                "End": true
            }
        }
    };

    let processedCount = 0;
    const totalItems = 10;

    const handlers = {
        processItem: async (input, context) => {
            await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    processedCount++;
                    resolve(`Processed ${input}`);
                }, 100);

                if (context.signal) {
                    context.signal.addEventListener('abort', () => {
                        clearTimeout(timeout);
                        reject(new Error('Item processing aborted'));
                    });
                }
            });
        }
    };

    const context = {
        handlers,
        quiet: true
    };

    const input = {
        items: Array.from({ length: totalItems }, (_, i) => i)
    };

    const controller = new AbortController();
    context.signal = controller.signal;
    const executionPromise = executeMachine(machine, context, input);

    // Cancel after 150ms (should allow some items to process)
    setTimeout(() => controller.abort(), 150);

    const [status, output] = await executionPromise;

    assert.is(status, STATE.FAILED);
    assert.ok(processedCount < totalItems, `Only ${processedCount} items should be processed, not all ${totalItems}`);
    assert.ok(processedCount > 0, 'Some items should have been processed before cancellation');
});

test('AbortController - Already Aborted Signal', async (assert) => {
    const machine = {
        "StartAt": "SimpleTask",
        "States": {
            "SimpleTask": {
                "Type": "Task",
                "Resource": "simpleTask",
                "End": true
            }
        }
    };

    let taskExecuted = false;

    const handlers = {
        simpleTask: async () => {
            taskExecuted = true;
            return 'Success';
        }
    };

    const context = {
        handlers,
        quiet: true
    };

    const controller = new AbortController();
    controller.abort(); // Abort before execution
    context.signal = controller.signal;

    const [status, output] = await executeMachine(machine, context, {});

    assert.is(status, STATE.FAILED);
    assert.notOk(taskExecuted, 'Task should not have been executed');
    const errorMessage = output.message || (output.error && output.error.message) || '';
    assert.ok(errorMessage.includes('aborted') || errorMessage.includes('Execution aborted'), 'Error should indicate abortion');
});
