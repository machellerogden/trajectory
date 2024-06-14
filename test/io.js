import { test } from 'zora';
import { JSONPathQuery, JSONPathParts, applyPath, assocPath, applyDataTemplate } from '../lib/io.js';

test('applyDataTemplate - 0', async (assert) => {

    const context = {
        contextFoo: 'context-foo'
    };

    const parameters = {
        a: '$.foo',
        b: {
            c: '$.bar',
            d: '$$.contextFoo'
        }
    };

    const input = {
        foo: 'foo',
        bar: 'bar'
    };

    const actual = applyDataTemplate(context, parameters, input);

    const expected = {
        a: 'foo',
        b: {
            c: 'bar',
            d: 'context-foo'
        }
    };

    assert.equal(actual, expected);

});
