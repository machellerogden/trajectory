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
    
    // Verify the structure of log calls - first arg is context, then event, then args
    assert.equal(logCalls[0][1], 'MachineStart');
    assert.equal(logCalls[0][2], input);
    assert.equal(logCalls[0][0].quiet, false);
    assert.equal(logCalls[0][0].depth, 1);
    
    assert.equal(logCalls[1][1], 'StateInfo');
    assert.equal(logCalls[1][2], 'StateInitialized');
    
    assert.equal(logCalls[2][1], 'StateInfo');
    assert.equal(logCalls[2][2], 'StateEntered');
    
    assert.equal(logCalls[3][1], 'StateInfo');
    assert.equal(logCalls[3][2], 'HandlerStarted');
    
    assert.equal(logCalls[4][1], 'StateSucceed');
    assert.equal(logCalls[4][2], 'HandlerSucceeded');
    assert.equal(logCalls[4][3], { foo: 'bar' });
    
    assert.equal(logCalls[5][1], 'StateInfo');
    assert.equal(logCalls[5][2], 'StateExited');
    
    assert.equal(logCalls[6][1], 'MachineSucceed');
    
    // Verify context is included in all calls
    logCalls.forEach(call => {
        assert.ok(call[0].hasOwnProperty('quiet'));
        assert.ok(call[0].hasOwnProperty('stateKey'));
        assert.ok(call[0].hasOwnProperty('state'));
        assert.ok(call[0].hasOwnProperty('depth'));
    });
});
