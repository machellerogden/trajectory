import { test } from 'zora';
import { executeMachine } from '../index.js';

test('Pass State - Basic', async (assert) => {
    const machine = {
        "StartAt": "PassState",
        "States": {
            "PassState": {
                "Type": "Pass",
                "Result": { "foo": "bar" },
                "End": true
            }
        }
    };

    const i = 0;
    const logCalls = [];
    const context = {
        quiet: false,
        log: (...args) => {
            logCalls.push(args);
        }
    };

    const input = {};

    const [ status, output ] = await executeMachine(machine, context, input);

    assert.is(status, 'SUCCEEDED');
    assert.equal(output, { foo: 'bar' });
    assert.equal(logCalls.length, 7);
    assert.deepEqual(logCalls, [
        [ 'MachineStart', {} ],
        [ 'StateInfo', 'StateInitialized', {} ],
        [ 'StateInfo', 'StateEntered', {} ],
        [ 'StateInfo', 'HandlerStarted', {} ],
        [ 'StateSucceed', 'HandlerSucceeded', { foo: 'bar' } ],
        [ 'StateInfo', 'StateExited', { foo: 'bar' } ],
        [ 'MachineSucceed', { foo: 'bar' } ]
    ]);
});
