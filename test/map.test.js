import { test } from 'zora';
import { executeMachine } from '../index.js';

test('Map - 0', async (assert) => {

    const machine = {
        "StartAt": "FooMap",
        "States": {
            "FooMap": {
                "Type": "Map",
                "ItemProcessor": {
                    "StartAt": "FooPass",
                    "States": {
                        "FooPass": {
                            "Type": "Pass",
                            "Next": "FooPlusOne"
                        },
                        "FooPlusOne": {
                            "Type": "Task",
                            "Resource": "add",
                            "Parameters": {
                                "a": 1,
                                "b.$": "$.item"
                            }
                        }
                    }
                },
                "ItemsPath": "$.items",
                "ItemSelector": {
                    "item.$": "$$.Map.Item.Value"
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

    const input = { items: [ 1, 2, 3 ] };

    const [ status, output ] = await executeMachine(machine, context, input);

    assert.is(status, 'SUCCEEDED');
    assert.equal(output, [2, 3, 4]);

});

/**
 * Test for proper variable resolution from within the Map state when using `$$.Map.Item.Value`
 */
test('Map - $$MapItemValue', async (assert) => {

    const machine = {
        "StartAt": "FooMap",
        "States": {
            "FooMap": {
                "Type": "Map",
                "ItemProcessor": {
                    "StartAt": "GetValue",
                    "States": {
                        "GetValue": {
                            "Type": "Task",
                            "Resource": "getValue",
                            "Parameters": {
                                "value.$": "$.foo"
                            },
                            "End": true
                        }
                    }
                },
                "ItemsPath": "$.items",
                "ItemSelector": {
                    "foo.$": "$$.Map.Item.Value"
                },
                "End": true
            }
        }
    };

    const handlers = {
        getValue: ({ value }) => value
        //getValue: (a) => (console.log(a), a.value)
    };

    const context = {
        handlers,
        quiet: true
    };

    const input = { items: [ 1, 2, 3 ] };

    const [ status, output ] = await executeMachine(machine, context, input);

    assert.is(status, 'SUCCEEDED');
    assert.equal(output, [1, 2, 3]);

});

/**
 * Test for proper variable resolution from within the Map state when using `$$.Map.Item.Index`
 */
test('Map - $$MapItemIndex', async (assert) => {

    const machine = {
        "StartAt": "FooMap",
        "States": {
            "FooMap": {
                "Type": "Map",
                "ItemProcessor": {
                    "StartAt": "GetIndex",
                    "States": {
                        "GetIndex": {
                            "Type": "Task",
                            "Resource": "getIndex",
                            "Parameters": {
                                "index.$": "$.item.Index"
                            },
                            "End": true
                        }
                    }
                },
                "ItemsPath": "$.items",
                "ItemSelector": {
                    "item.$": "$$.Map.Item"
                },
                "End": true
            }
        }
    };

    const handlers = {
        getIndex: ({ index }) => index
    };

    const context = {
        handlers,
        quiet: true
    };

    const input = { items: [ 1, 2, 3 ] };

    const [ status, output ] = await executeMachine(machine, context, input);

    assert.is(status, 'SUCCEEDED');
    assert.equal(output, [0, 1, 2]);

});

/**
 * Test for proper variable resolution from within the Map state when using `$$.Map.Item.Parent`
 */
test('Map - $$MapItemParent', async (assert) => {

    const machine = {
        "StartAt": "FooMap",
        "States": {
            "FooMap": {
                "Type": "Map",
                "ItemProcessor": {
                    "StartAt": "GetParent",
                    "States": {
                        "GetParent": {
                            "Type": "Task",
                            "Resource": "getParent",
                            "Parameters": {
                                "parent.$": "$.item.Parent"
                            },
                            "End": true
                        }
                    }
                },
                "ItemsPath": "$.items",
                "ItemSelector": {
                    "item.$": "$$.Map.Item"
                },
                "End": true
            }
        }
    };

    const handlers = {
        getParent: ({ parent }) => parent
    };

    const context = {
        handlers,
        quiet: true
    };

    const input = { items: [ 1, 2, 3 ], jobId: 'job-123' };

    const [ status, output ] = await executeMachine(machine, context, input);

    assert.is(status, 'SUCCEEDED');
    assert.equal(output, [{ items: [ 1, 2, 3 ], jobId: 'job-123' }, { items: [ 1, 2, 3 ], jobId: 'job-123' }, { items: [ 1, 2, 3 ], jobId: 'job-123' }]);

});

test('Map - Compare jobId', async (assert) => {

    const machine = {
        "StartAt": "ProcessJobs",
        "States": {
            "ProcessJobs": {
                "Type": "Map",
                "ItemsPath": "$.jobs",
                "ItemSelector": {
                    "item.$": "$$.Map.Item.Value",
                    "parent.$": "$$.Map.Item.Parent",
                    "root.$": "$",
                },
                "ItemProcessor": {
                    "StartAt": "ProcessJob",
                    "States": {
                        "ProcessJob": {
                            "Type": "Task",
                            "Resource": "compareJobIds",
                            "Parameters": {
                                "jobIdA.$": "$.item.jobId",
                                "jobIdB.$": "$.parent.jobId",
                                "jobIdC.$": "$.root.jobId"
                            },
                            "End": true
                        }
                    }
                },
                "End": true
            }
        }
    };

    const handlers = {
        compareJobIds: ({ jobIdA, jobIdB, jobIdC }) => ({ jobIdA, jobIdB, jobIdC })
    };

    const context = {
        handlers,
        quiet: true
    };

    const input = {
        jobs: [
            { jobId: 'job-001', tasks: [ { taskId: 'task-001-1' }, { taskId: 'task-001-2' } ] },
            { jobId: 'job-002', tasks: [ { taskId: 'task-002-1' }, { taskId: 'task-002-2' } ] }
        ],
        jobId: 'outer-job-id'
    };

    const [ status, output ] = await executeMachine(machine, context, input);

    assert.is(status, 'SUCCEEDED');
    assert.equal(output, [
        { jobIdA: 'job-001', jobIdB: 'outer-job-id', jobIdC: 'outer-job-id'},
        { jobIdA: 'job-002', jobIdB: 'outer-job-id', jobIdC: 'outer-job-id'}
    ]);

});

test('Map - Concurrency limit: MaxConcurrency=2', async (assert) => {
    let activeTasks = 0;
    let peakConcurrency = 0;

    const handlers = {
        slowTask: async (input) => {
            activeTasks++;
            peakConcurrency = Math.max(peakConcurrency, activeTasks);
            // Simulate asynchronous workload
            await new Promise((resolve) => setTimeout(resolve, 50));
            activeTasks--;
            return `Processed: ${input}`;
        }
    };

    const machine = {
        StartAt: 'ConcurrentMap',
        States: {
            ConcurrentMap: {
                Type: 'Map',
                // We supply 4 items
                ItemsPath: '$.numbers',
                ItemSelector: {
                    'item.$': '$$.Map.Item.Value'
                },
                ItemProcessor: {
                    StartAt: 'SlowTask',
                    States: {
                        SlowTask: {
                            Type: 'Task',
                            Resource: 'slowTask',
                            End: true
                        }
                    }
                },
                MaxConcurrency: 2,
                End: true
            }
        }
    };

    const input = { numbers: [1, 2, 3, 4] };
    const context = { handlers, quiet: true };

    const [status, output] = await executeMachine(machine, context, input);

    assert.equal(status, 'SUCCEEDED', 'Machine should succeed');
    // The order might not be guaranteed, but length is 4
    assert.equal(output.length, 4, 'Should process all 4 items');
    assert.ok(peakConcurrency <= 2, `Peak concurrency (${peakConcurrency}) should not exceed 2`);
});

test('Map - ToleratedFailureCount=2 => fail on 3rd failure', async (assert) => {
    let callCount = 0;
    const handlers = {
        sometimesFail: (input) => {
            callCount++;
            // We'll fail the first 3 calls, succeed on calls 4 & 5
            if (callCount <= 3) {
                throw new Error(`Forced error #${callCount}`);
            }
            return `Success #${callCount}`;
        }
    };

    const machine = {
        StartAt: 'MapState',
        States: {
            MapState: {
                Type: 'Map',
                ItemsPath: '$.items',
                ItemSelector: {
                    'value.$': '$$.Map.Item.Value'
                },
                ItemProcessor: {
                    StartAt: 'TaskX',
                    States: {
                        TaskX: {
                            Type: 'Task',
                            Resource: 'sometimesFail',
                            End: true
                        }
                    }
                },
                MaxConcurrency: 1,
                ToleratedFailureCount: 2,
                End: true
            }
        }
    };

    const input = { items: [1, 2, 3, 4, 5] };
    const context = { handlers, quiet: true };

    const [ status, output ] = await executeMachine(machine, context, input);

    // We expect the map to fail on the 3rd failure => "status" should be "FAILED"
    assert.equal(status, 'FAILED', 'The map must fail once we exceed ToleratedFailureCount=2');
    assert.ok(output instanceof Error, 'Output should be the error that triggered the final failure');
    assert.equal(callCount, 3, 'Should have stopped after the 3rd item fails (no need to continue)');
});

test('Map - ToleratedFailurePercentage=50 => 2 of 4 can fail without failing the map', async (assert) => {
    const handlers = {
        halfFail: ({ x }) => {
            // If x is odd => fail
            if (x % 2 === 1) {
                throw new Error(`Odd number fail: ${x}`);
            }
            return `Even success: ${x}`;
        }
    };

    const machine = {
        StartAt: 'MapState',
        States: {
            MapState: {
                Type: 'Map',
                ItemsPath: '$.items',
                ItemSelector: {
                    'x.$': '$$.Map.Item.Value'
                },
                ItemProcessor: {
                    StartAt: 'TaskX',
                    States: {
                        TaskX: {
                            Type: 'Task',
                            Resource: 'halfFail',
                            End: true
                        }
                    }
                },
                MaxConcurrency: 1,
                ToleratedFailurePercentage: 50, // up to 50% can fail
                End: true
            }
        }
    };

    const input = { items: [1,2,3,4] };
    const context = { handlers, quiet: true };

    const [ status, output ] = await executeMachine(machine, context, input);

    // 1 and 3 will fail, 2 and 4 will succeed => 50% fail => still OK
    assert.equal(status, 'SUCCEEDED', 'Map should still succeed with exactly 50% failures allowed.');
    // The output array should have 4 items (some may be {error:...})
    assert.equal(output.length, 4, 'Should produce 4 outputs');
    const errorObjects = output.filter(x => x && x.error).map(x => x.error);
    assert.equal(errorObjects.length, 2, 'Should have 2 errors in the output array');
});

test('Map - ItemReader usage', async (assert) => {
    const handlers = {
        myItemReader: (input) => {
            // Pretend we get items from a DB or external service
            // For demonstration, just return a static array:
            return [10, 20, 30];
        },
        addOne: (input) => input.num + 1
    };

    const machine = {
        StartAt: 'ReadAndMap',
        States: {
            ReadAndMap: {
                Type: 'Map',

                // Instead of providing ItemsPath, we define an ItemReader
                // that produces an array of items dynamically
                ItemReader: {
                    Resource: 'myItemReader',
                    Parameters: {
                        // We can pass something from the input, if we want
                        jobId: '$.jobId'
                    }
                },

                // For each item returned by ItemReader, we apply ItemSelector
                ItemSelector: {
                    'num.$': '$$.Map.Item.Value'
                },

                // Then we process them in the ItemProcessor
                ItemProcessor: {
                    StartAt: 'AddOne',
                    States: {
                        AddOne: {
                            Type: 'Task',
                            Resource: 'addOne',
                            End: true
                        }
                    }
                },

                End: true
            }
        }
    };

    const input = { jobId: 'job-xyz' };
    const context = { handlers, quiet: true };

    const [ status, output ] = await executeMachine(machine, context, input);

    assert.equal(status, 'SUCCEEDED', 'Machine should succeed');
    // The flow:
    //  1) myItemReader => returns [10, 20, 30]
    //  2) Each item => { num: <itemValue> }
    //  3) AddOne => itemValue + 1 => [11, 21, 31]
    assert.deepEqual(output, [11, 21, 31], 'Should transform the items returned by ItemReader');
});

test('Map - ItemBatcher usage', async (assert) => {
    const handlers = {
        chunker: (items) => {
            // Example "ItemBatcher": chunk the array into size-2 sub-arrays
            const chunkSize = 2;
            const result = [];
            for (let i = 0; i < items.length; i += chunkSize) {
                result.push(items.slice(i, i + chunkSize));
            }
            return result; // e.g. [ [1,2], [3,4], [5] ]
        },
        sumArray: (input) => {
            // Suppose input.arr is the batch
            return input.arr.reduce((a, b) => a + b, 0);
        }
    };

    const machine = {
        StartAt: 'MapWithBatcher',
        States: {
            MapWithBatcher: {
                Type: 'Map',
                ItemsPath: '$.numbers',

                // ItemBatcher => transform the array into sub-arrays
                ItemBatcher: {
                    Resource: 'chunker',
                    // Potentially we could have "Parameters" if needed
                },

                ItemSelector: {
                    // each "item" from the batcher is itself an array
                    'arr.$': '$$.Map.Item.Value'
                },

                ItemProcessor: {
                    StartAt: 'SumBatch',
                    States: {
                        SumBatch: {
                            Type: 'Task',
                            Resource: 'sumArray',
                            End: true
                        }
                    }
                },
                End: true
            }
        }
    };

    const input = { numbers: [1, 2, 3, 4, 5] };
    const context = { handlers, quiet: true };

    const [ status, output ] = await executeMachine(machine, context, input);

    assert.equal(status, 'SUCCEEDED', 'Machine should succeed');
    // chunker => [ [1,2], [3,4], [5] ]
    // sum each => [3, 7, 5]
    assert.deepEqual(output, [3, 7, 5], 'Should sum each chunk from the item batcher');
});

test('Map - ResultWriter usage (aggregate final results)', async (assert) => {
    const handlers = {
        multiplyByTwo: (input) => input.val * 2,
        finalAggregator: (allOutputs) => {
            // Suppose "allOutputs" is the array of results from the map
            // We'll sum them up
            const sum = allOutputs.reduce((a, v) => a + v, 0);
            return { totalSum: sum };
        }
    };

    const machine = {
        StartAt: 'MapWithWriter',
        States: {
            MapWithWriter: {
                Type: 'Map',
                ItemsPath: '$.values',
                ItemSelector: {
                    'val.$': '$$.Map.Item.Value'
                },
                ItemProcessor: {
                    StartAt: 'MultiplyTask',
                    States: {
                        MultiplyTask: {
                            Type: 'Task',
                            Resource: 'multiplyByTwo',
                            End: true
                        }
                    }
                },
                // After all items are processed, we call the ResultWriter
                ResultWriter: {
                    Resource: 'finalAggregator',
                    // Optionally, we can specify "Parameters" if needed
                },
                End: true
            }
        }
    };

    const input = { values: [1,2,3,4] };
    const context = { handlers, quiet: true };

    const [ status, output ] = await executeMachine(machine, context, input);

    assert.equal(status, 'SUCCEEDED');
    // multiplyByTwo => [2,4,6,8], then aggregator => totalSum=20
    assert.deepEqual(output, { totalSum: 20 }, 'Should aggregate the final results with the ResultWriter');
});

test('Map - Full combined usage (ItemReader, Batcher, concurrency=2, partial-fail=1, ResultWriter)', async (assert) => {
    let concurrencyActive = 0;
    let concurrencyPeak = 0;

    const handlers = {
        readItems: (input) => {
            // Return 4 items
            return [1, 2, 3, 4];
        },
        batcher: (arr) => {
            // Return an array-of-arrays in chunks of 2
            return [ arr.slice(0,2), arr.slice(2) ];
        },
        sometimesFail: async (input) => {
            concurrencyActive++;
            concurrencyPeak = Math.max(concurrencyPeak, concurrencyActive);
            // We'll fail on value=3, succeed otherwise
            await new Promise((res) => setTimeout(res, 50));
            concurrencyActive--;
            if (input.value.includes(3)) {
                throw new Error('Found a 3 in this batch');
            }
            return input.value.map(x => `Processed-${x}`);
        },
        finalizeResults: (all) => {
            // We'll just return them as an object
            return { final: all };
        }
    };

    const machine = {
        StartAt: 'EverythingMap',
        States: {
            EverythingMap: {
                Type: 'Map',
                // Instead of ItemsPath, we use an ItemReader
                ItemReader: {
                    Resource: 'readItems'
                },
                // Then we chunk them
                ItemBatcher: {
                    Resource: 'batcher'
                },
                // concurrency limit
                MaxConcurrency: 2,
                // partial failure threshold: only 1 fail allowed
                ToleratedFailureCount: 1,

                // Standard pattern: itemSelector => itemProcessor
                ItemSelector: {
                    'value.$': '$$.Map.Item.Value'
                },
                ItemProcessor: {
                    StartAt: 'SometimesFail',
                    States: {
                        SometimesFail: {
                            Type: 'Task',
                            Resource: 'sometimesFail',
                            End: true
                        }
                    }
                },

                // Finally, the writer
                ResultWriter: {
                    Resource: 'finalizeResults'
                },
                End: true
            }
        }
    };

    const context = { handlers, quiet: true };
    const input = {};

    const [ status, output ] = await executeMachine(machine, context, input);

    // We expect:
    //   read => [1,2,3,4]
    //   batch => [ [1,2], [3,4] ]
    //   itemProcessor => first chunk => [1,2], second chunk => [3,4]
    //   - item=1 => success
    //   - item=2 => success
    //   - item=3 => fail
    //   - item=4 => success
    // We have 1 fail => that's within ToleratedFailureCount=1 => map still SUCCEEDS
    assert.equal(status, 'SUCCEEDED', 'Map should succeed with exactly 1 failure allowed');

    // The final results array => [ "Processed-1", "Processed-2", {error: Error('Item=3 forced failure')}, "Processed-4" ]
    // Then finalizeResults => { final: [...] }
    assert.ok(Array.isArray(output.final), 'Output should have a "final" array property');
    assert.equal(output.final.length, 2, 'We expect 2 items because we have 2 batches of items');
    const failureItems = output.final.flat().filter(r => r && r.error);
    assert.equal(failureItems.length, 1, 'One item (the value=3) should have failed');

    // concurrency
    assert.ok(concurrencyPeak <= 2, `Peak concurrency was ${concurrencyPeak}, should be <=2`);
});
