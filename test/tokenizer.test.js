import { test } from 'zora';
import { tokenizeArgs } from '../lib/tokenizer.js';

test('tokenizeArgs - Basic Arguments', (assert) => {
    const result = tokenizeArgs('arg1, arg2, arg3');
    assert.deepEqual(result, ['arg1', 'arg2', 'arg3'], 'Should tokenize a basic argument list');
});

test('tokenizeArgs - Nested Parentheses', (assert) => {
    const result = tokenizeArgs('arg1, States.Function(arg2, arg3), arg4');
    assert.deepEqual(result, ['arg1', 'States.Function(arg2, arg3)', 'arg4'], 'Should handle nested parentheses correctly');
});

test('tokenizeArgs - Strings with Commas', (assert) => {
    const result = tokenizeArgs('"arg,1", \'arg,2\', arg3');
    assert.deepEqual(result, ['"arg,1"', "'arg,2'", 'arg3'], 'Should handle strings with commas correctly');
});

test('tokenizeArgs - Escaped Characters in Strings', (assert) => {
    const result = tokenizeArgs('"arg1\\,arg2", \'arg3\\,arg4\'');
    assert.deepEqual(result, ['"arg1\\,arg2"', "'arg3\\,arg4'"], 'Should handle escaped commas in strings');
});

test('tokenizeArgs - Empty Arguments', (assert) => {
    const result = tokenizeArgs('arg1,,arg3');
    assert.deepEqual(result, ['arg1', '', 'arg3'], 'Should handle empty arguments');
});

test('tokenizeArgs - Edge Cases', (assert) => {
    const emptyResult = tokenizeArgs('');
    assert.deepEqual(emptyResult, [], 'Should handle empty input');

    const singleResult = tokenizeArgs('arg1');
    assert.deepEqual(singleResult, ['arg1'], 'Should handle a single argument');

    const complexResult = tokenizeArgs(
        'States.Function(arg1, States.Other(arg2, States.Third(arg3, arg4)))'
    );
    assert.deepEqual(
        complexResult,
        ['States.Function(arg1, States.Other(arg2, States.Third(arg3, arg4)))'],
        'Should handle complex nested arguments'
    );
});
