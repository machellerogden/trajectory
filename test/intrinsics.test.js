import { test } from 'zora';
import { intrinsics } from '../lib/intrinsics.js';

test('States.Array', (assert) => {
    const result = intrinsics['States.Array'](1, 2, 3);
    assert.deepEqual(result, [1, 2, 3], 'Should create an array from arguments');
});

test('States.ArrayPartition', (assert) => {
    const result = intrinsics['States.ArrayPartition']([1, 2, 3, 4, 5], 2);
    assert.deepEqual(result, [[1, 2], [3, 4], [5]], 'Should partition array into chunks');
});

test('States.ArrayContains', (assert) => {
    const result = intrinsics['States.ArrayContains']([1, 2, 3], 2);
    assert.equal(result, true, 'Should return true if value is in array');

    const resultFalse = intrinsics['States.ArrayContains']([1, 2, 3], 4);
    assert.equal(resultFalse, false, 'Should return false if value is not in array');
});

test('States.ArrayRange', (assert) => {
    const result = intrinsics['States.ArrayRange'](1, 5, 2);
    assert.deepEqual(result, [1, 3, 5], 'Should create an array from range with step');

    const resultDefaultStep = intrinsics['States.ArrayRange'](1, 3);
    assert.deepEqual(resultDefaultStep, [1, 2, 3], 'Should create an array with default step 1');
});

test('States.ArrayGetItem', (assert) => {
    const result = intrinsics['States.ArrayGetItem']([1, 2, 3], 1);
    assert.equal(result, 2, 'Should get the item at specified index');
});

test('States.ArrayLength', (assert) => {
    const result = intrinsics['States.ArrayLength']([1, 2, 3]);
    assert.equal(result, 3, 'Should return the length of the array');
});

test('States.ArrayUnique', (assert) => {
    const result = intrinsics['States.ArrayUnique']([1, 2, 2, 3, 3, 3]);
    assert.deepEqual(result, [1, 2, 3], 'Should remove duplicates from array');
});

test('States.Base64Encode', (assert) => {
    const result = intrinsics['States.Base64Encode']('Hello, World!');
    assert.equal(result, 'SGVsbG8sIFdvcmxkIQ==', 'Should encode string to Base64');
});

test('States.Base64Decode', (assert) => {
    const result = intrinsics['States.Base64Decode']('SGVsbG8sIFdvcmxkIQ==');
    assert.equal(result, 'Hello, World!', 'Should decode Base64 string to original string');
});

test('States.Base64Encode and Base64Decode Roundtrip', (assert) => {
    const original = 'Encode this text';
    const encoded = intrinsics['States.Base64Encode'](original);
    const decoded = intrinsics['States.Base64Decode'](encoded);
    assert.equal(decoded, original, 'Should encode and decode back to the original string');
});

test('States.Hash - MD5', (assert) => {
    const result = intrinsics['States.Hash']('Hello, World!', 'MD5');
    assert.equal(result, '65a8e27d8879283831b664bd8b7f0ad4', 'Should calculate MD5 hash of the input string');
});

test('States.Hash - SHA-256', (assert) => {
    const result = intrinsics['States.Hash']('Hello, World!', 'SHA-256');
    assert.equal(result, 'dffd6021bb2bd5b0af676290809ec3a53191dd81c7f70a4b28688a362182986f', 'Should calculate SHA-256 hash of the input string');
});

test('States.Hash - Unsupported Algorithm', (assert) => {
    try {
        intrinsics['States.Hash']('Hello, World!', 'INVALID-ALG');
        assert.fail('Should throw an error for unsupported algorithm');
    } catch (error) {
        assert.equal(error.message, 'States.Hash: Unsupported algorithm. Supported algorithms are: MD5, SHA-1, SHA-256, SHA-384, SHA-512');
    }
});

test('States.Hash - Input Validation', (assert) => {
    try {
        intrinsics['States.Hash'](123, 'SHA-256');
        assert.fail('Should throw an error for non-string input');
    } catch (error) {
        assert.equal(error.message, 'States.Hash: Input must be a string.');
    }

    try {
        intrinsics['States.Hash']('Hello', 123);
        assert.fail('Should throw an error for non-string algorithm');
    } catch (error) {
        assert.equal(error.message, 'States.Hash: Algorithm must be a string.');
    }
});

test('States.JsonMerge', (assert) => {
    const json1 = { a: 1, b: 2 };
    const json2 = { b: 3, c: 4 };

    const result = intrinsics['States.JsonMerge'](json1, json2);
    assert.deepEqual(result, { a: 1, b: 3, c: 4 }, 'Should shallow merge two JSON objects');

    try {
        intrinsics['States.JsonMerge'](json1, json2, true);
        assert.fail('Should throw an error for deep merging');
    } catch (error) {
        assert.equal(error.message, 'States.JsonMerge: Deep merging is not supported.');
    }
});

test('States.StringToJson', (assert) => {
    const jsonString = '{"foo": "bar"}';
    const result = intrinsics['States.StringToJson'](jsonString);
    assert.deepEqual(result, { foo: 'bar' }, 'Should convert a JSON string to a JSON object');

    try {
        intrinsics['States.StringToJson']('invalid-json');
        assert.fail('Should throw an error for invalid JSON string');
    } catch (error) {
        assert.equal(error.message, 'States.StringToJson: Invalid JSON string.');
    }
});

test('States.JsonToString', (assert) => {
    const jsonObject = { foo: 'bar' };
    const result = intrinsics['States.JsonToString'](jsonObject);
    assert.equal(result, '{"foo":"bar"}', 'Should convert a JSON object to a JSON string');

    try {
        intrinsics['States.JsonToString']('not-a-json-object');
        assert.fail('Should throw an error for invalid JSON object');
    } catch (error) {
        assert.equal(error.message, 'States.JsonToString: Input must be a JSON object.');
    }
});

test('States.MathAdd', (assert) => {
    const result = intrinsics['States.MathAdd'](5, 7);
    assert.equal(result, 12, 'Should add two numbers');

    try {
        intrinsics['States.MathAdd'](5, '7');
        assert.fail('Should throw an error for non-number input');
    } catch (error) {
        assert.equal(error.message, 'States.MathAdd: Both inputs must be numbers.');
    }
});

test('States.MathRandom', (assert) => {
    const result = intrinsics['States.MathRandom'](1, 10);
    assert.ok(result >= 1 && result < 10, 'Should generate a random number in the given range');

    try {
        intrinsics['States.MathRandom'](10, 1);
        assert.fail('Should throw an error if start >= end');
    } catch (error) {
        assert.equal(error.message, 'States.MathRandom: Start and end must be numbers, with start < end.');
    }
});

test('States.UUID', (assert) => {
    const uuid = intrinsics['States.UUID']();
    assert.equal(typeof uuid, 'string', 'Should generate a UUID');
    assert.ok(uuid.match(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/), 'Should be a valid version 4 UUID');
});

test('States.Format', (assert) => {
    const result = intrinsics['States.Format']('Hello, {}!', 'World');
    assert.equal(result, 'Hello, World!', 'Should replace placeholder with value');

    const multiPlaceholderResult = intrinsics['States.Format']('{}, {} and {}', 'One', 'Two', 'Three');
    assert.equal(multiPlaceholderResult, 'One, Two and Three', 'Should replace multiple placeholders with values');

    try {
        intrinsics['States.Format']('Hello, {}!');
        assert.fail('Should throw an error if not enough values are provided');
    } catch (error) {
        assert.equal(error.message, 'States.Format: Not enough values provided for placeholders.');
    }
});

test('States.StringSplit', (assert) => {
    const input = 'one,two,three';
    const delimiter = ',';

    const result = intrinsics['States.StringSplit'](input, delimiter);
    assert.deepEqual(result, ['one', 'two', 'three'], 'Should split string into an array based on the delimiter');

    const emptyDelimiterResult = intrinsics['States.StringSplit']('hello', '');
    assert.deepEqual(emptyDelimiterResult, ['h', 'e', 'l', 'l', 'o'], 'Should split string into characters if delimiter is empty');

    try {
        intrinsics['States.StringSplit'](123, ',');
        assert.fail('Should throw an error if input is not a string');
    } catch (error) {
        assert.equal(error.message, 'States.StringSplit: Input must be a string.');
    }

    try {
        intrinsics['States.StringSplit']('one,two,three', 123);
        assert.fail('Should throw an error if delimiter is not a string');
    } catch (error) {
        assert.equal(error.message, 'States.StringSplit: Delimiter must be a string.');
    }
});
