import { test } from 'zora';
import { resolveIntrinsic } from '../lib/intrinsicResolver.js';
import { intrinsics } from '../lib/intrinsics.js';

test('resolveIntrinsic - Valid Intrinsics', (assert) => {
    const context = { foo: 42 };
    const data = { items: [1, 2, 3] };

    const arrayResult = resolveIntrinsic('States.Array(1, 2, 3)', context, data);
    assert.deepEqual(arrayResult, [1, 2, 3], 'Should resolve States.Array correctly');

    const lengthResult = resolveIntrinsic('States.ArrayLength($.items)', context, data);
    assert.equal(lengthResult, 3, 'Should resolve States.ArrayLength with JSONPath correctly');
});

test('resolveIntrinsic - Invalid Function', (assert) => {
    try {
        resolveIntrinsic('States.InvalidFunction()', {}, {});
        assert.fail('Should throw an error for unsupported intrinsic function');
    } catch (error) {
        assert.equal(error.message, 'resolveIntrinsic: Unsupported intrinsic function: States.InvalidFunction');
    }
});

test('resolveIntrinsic - Invalid Format', (assert) => {
    try {
        resolveIntrinsic('InvalidFormat()', {}, {});
        assert.fail('Should throw an error for invalid intrinsic function format');
    } catch (error) {
        assert.equal(error.message, 'resolveIntrinsic: Invalid intrinsic function format: InvalidFormat()');
    }
});

test('resolveIntrinsic - Argument Parsing', (assert) => {
    const context = { foo: 'context-value' };
    const data = { bar: 'data-value' };

    const result = resolveIntrinsic('States.Array($$.foo, $.bar, "literal")', context, data);
    assert.deepEqual(result, ['context-value', 'data-value', 'literal'], 'Should resolve arguments correctly');
});

test('resolveIntrinsic - Nested Intrinsics (Simple)', (assert) => {
    const context = {};
    const data = {};

    const result = resolveIntrinsic(
        'States.Array(States.MathAdd(1, 2), States.MathAdd(3, 4))',
        context,
        data
    );
    assert.deepEqual(result, [3, 7], 'Should resolve nested intrinsic functions');
});

test('resolveIntrinsic - Nested Intrinsics (Complex)', (assert) => {
    const context = {};
    const data = {};

    const result = resolveIntrinsic(
        'States.StringToJson(States.JsonToString(States.JsonMerge({"a": 1}, {"b": 2})))',
        context,
        data
    );
    assert.deepEqual(result, { a: 1, b: 2 }, 'Should resolve deeply nested intrinsic functions');
});

 test('resolveIntrinsic - Mixed Context and Data', (assert) => {
     const context = { contextValue: 'from-context' };
     const data = { dataValue: 5 };

     const result = resolveIntrinsic(
         'States.Array($$.contextValue, States.MathAdd($.dataValue, 10))',
         context,
         data
     );
     assert.deepEqual(result, ['from-context', 15], 'Should resolve intrinsic functions with mixed context and data');
 });
