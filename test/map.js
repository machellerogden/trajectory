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
                                "b.$": "$"
                            }
                        }
                    }
                },
                "ItemsPath": "$.items",
                "End": true
            }
        }
    };

    const handlers = {
        add: ({ a, b }) => a + b
    };

    const context = {
        handlers,
        quiet: false
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
                                "value.$": "$$.Map.Item.Value"
                            },
                            "End": true
                        }
                    }
                },
                "ItemsPath": "$.items",
                "End": true
            }
        }
    };

    const handlers = {
        //getValue: ({ value }) => value
        getValue: (a) => (console.log(a), a.value)
    };

    const context = {
        handlers,
        quiet: false
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
                                "index.$": "$$.Map.Item.Index"
                            },
                            "End": true
                        }
                    }
                },
                "ItemsPath": "$.items",
                "End": true
            }
        }
    };

    const handlers = {
        getIndex: ({ index }) => index
    };

    const context = {
        handlers,
        quiet: false
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
                                "parent.$": "$$.Map.Item.Parent"
                            },
                            "End": true
                        }
                    }
                },
                "ItemsPath": "$.items",
                "End": true
            }
        }
    };

    const handlers = {
        getParent: ({ parent }) => parent
    };

    const context = {
        handlers,
        quiet: false
    };

    const input = { items: [ 1, 2, 3 ], jobId: 'job-123' };

    const [ status, output ] = await executeMachine(machine, context, input);

    assert.is(status, 'SUCCEEDED');
    assert.equal(output, [{ items: [ 1, 2, 3 ], jobId: 'job-123' }, { items: [ 1, 2, 3 ], jobId: 'job-123' }, { items: [ 1, 2, 3 ], jobId: 'job-123' }]);

});
