import { test } from 'zora';
import { executeMachine } from '../index.js';

test('Integration - Intrinsics in Workflow', async (assert) => {
    const machine = {
        StartAt: 'Calculate',
        States: {
            Calculate: {
                Type: 'Task',
                Parameters: {
                    sum: 'States.MathAdd($.a, $.b)',
                    array: 'States.Array(States.MathAdd(1, 2), States.MathAdd(3, 4))',
                },
                Resource: 'processResults',
                End: true,
            },
        },
    };

    const handlers = {
        processResults: (input) => input,
    };

    const context = { handlers, quiet: true };
    const input = { a: 5, b: 10 };

    const [status, output] = await executeMachine(machine, context, input);

    assert.equal(status, 'SUCCEEDED', 'Workflow should succeed');
    assert.deepEqual(output, {
        sum: 15,
        array: [3, 7],
    }, 'Intrinsic functions should resolve correctly within workflow execution');
});
