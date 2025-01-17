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

    const context = {
        quiet: true
    };

    const input = {};

    const [ status, output ] = await executeMachine(machine, context, input);

    assert.is(status, 'SUCCEEDED');
    assert.equal(output, { foo: 'bar' });
});

test('Pass State - InputPath', async (assert) => {
    const machine = {
        "StartAt": "PassState",
        "States": {
            "PassState": {
                "Type": "Pass",
                "InputPath": "$.foo",
                "Result": { "foo": "bar" },
                "End": true
            }
        }
    };

    const context = {
        quiet: true
    };

    const input = { foo: { bar: 'baz' } };

    const [ status, output ] = await executeMachine(machine, context, input);

    assert.is(status, 'SUCCEEDED');
    assert.equal(output, { foo: 'bar' });
});

test('Pass State - OutputPath', async (assert) => {
    const machine = {
        "StartAt": "PassState",
        "States": {
            "PassState": {
                "Type": "Pass",
                "Result": { "foo": "bar" },
                "OutputPath": "$.foo",
                "End": true
            }
        }
    };

    const context = {
        quiet: true
    };

    const input = {};

    const [ status, output ] = await executeMachine(machine, context, input);

    assert.is(status, 'SUCCEEDED');
    assert.equal(output, 'bar');
});

test('Pass State - ResultPath', async (assert) => {
    const machine = {
        "StartAt": "PassState",
        "States": {
            "PassState": {
                "Type": "Pass",
                "Result": { "foo": "bar" },
                "ResultPath": "$.result",
                "End": true
            }
        }
    };

    const context = {
        quiet: true
    };

    const input = {};

    const [ status, output ] = await executeMachine(machine, context, input);

    assert.is(status, 'SUCCEEDED');
    assert.equal(output, { result: { foo: 'bar' } });
});
