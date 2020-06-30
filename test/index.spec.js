'use strict';

const test = require('ava');
const sinon = require('sinon');
const { Trajectory } = require('..');

const testOptions = { silent: true };

test.beforeEach(t => t.context = { sandbox: sinon.createSandbox() });
test.afterEach(t => t.context.sandbox.restore());

test('should execute basic sequential tasks', async t => {
    t.plan(4);
    const a = t.context.sandbox.fake.returns({ a: 'a' });
    const b = t.context.sandbox.fake.returns({ b: 'b' });
    const c = t.context.sandbox.fake.returns({ c: 'c' });
    const resources = { a, b, c };
    const definition = {
        StartAt: 'a',
        States: {
            a: {
                Type: 'Task',
                Resource: 'a',
                Next: 'b'
            },
            c: {
                Type: 'Task',
                Resource: 'c',
                End: true
            },
            b: {
                Type: 'Task',
                Resource: 'b',
                Next: 'c'
            }
        }
    };
    const trajectory = new Trajectory({ ...testOptions, resources });
    const results = await trajectory.execute(definition);
    t.assert(a.calledOnce);
    t.assert(b.calledOnce);
    t.assert(c.calledOnce);
    t.deepEqual(results, [ {}, { a: 'a' }, { b: 'b' }, { c: 'c' } ]);
});

test('should thread io through states', async t => {
    t.plan(4);
    const a = t.context.sandbox.fake.returns({ a: 'a' });
    const b = t.context.sandbox.fake.returns({ b: 'b' });
    const c = t.context.sandbox.fake.returns({ c: 'c' });
    const resources = { a, b, c };
    const definition = {
        StartAt: 'a',
        States: {
            a: {
                Type: 'Task',
                Resource: 'a',
                Next: 'b'
            },
            c: {
                Type: 'Task',
                Resource: 'c',
                End: true
            },
            b: {
                Type: 'Task',
                Resource: 'b',
                Next: 'c'
            }
        }
    };
    const trajectory = new Trajectory({ ...testOptions, resources });
    const results = await trajectory.execute(definition);
    t.assert(a.calledWith({}));
    t.assert(b.calledWith({ a: 'a' }));
    t.assert(c.calledWith({ b: 'b' }));
    t.deepEqual(results, [ {}, { a: 'a' }, { b: 'b' }, { c: 'c' } ]);
});

test('should thread io through states - resultPath', async t => {
    t.plan(4);
    const a = t.context.sandbox.fake.returns({ a: 'a' });
    const b = t.context.sandbox.fake.returns({ b: 'b' });
    const c = t.context.sandbox.fake.returns({ c: 'c' });
    const resources = { a, b, c };
    const definition = {
        StartAt: 'a',
        States: {
            a: {
                Type: 'Task',
                Resource: 'a',
                ResultPath: '$.apath',
                Next: 'b'
            },
            c: {
                Type: 'Task',
                Resource: 'c',
                ResultPath: '$.cpath',
                End: true
            },
            b: {
                Type: 'Task',
                Resource: 'b',
                ResultPath: '$.bpath',
                Next: 'c'
            }
        }
    };
    const trajectory = new Trajectory({ ...testOptions, resources });
    const results = await trajectory.execute(definition);
    t.assert(a.calledWith({}));
    t.assert(b.calledWith({
        'apath': {
            a: 'a'
        }
    }));
    t.assert(c.calledWith({
        'apath': {
            a: 'a'
        },
        'bpath': {
            b: 'b'
        }
    }));
    t.deepEqual(results, [
        {},
        {
            'apath': {
                a: 'a'
            }
        },
        {
            'apath': {
                a: 'a'
            },
            'bpath': {
                b: 'b'
            }
        }, {
            'apath': {
                a: 'a'
            },
            'bpath': {
                b: 'b'
            },
            'cpath': {
                c: 'c'
            }
        }
    ]);
});

test('should thread io through states - resultPath + inputPath', async t => {
    t.plan(4);
    const a = t.context.sandbox.fake.returns({ a: 'a' });
    const b = t.context.sandbox.fake.returns({ b: 'b' });
    const c = t.context.sandbox.fake.returns({ c: 'c' });
    const resources = { a, b, c };
    const definition = {
        StartAt: 'a',
        States: {
            a: {
                Type: 'Task',
                Resource: 'a',
                ResultPath: '$.apath',
                Next: 'b'
            },
            c: {
                Type: 'Task',
                Resource: 'c',
                InputPath: '$.bpath',
                ResultPath: '$.cpath',
                End: true
            },
            b: {
                Type: 'Task',
                Resource: 'b',
                InputPath: '$.apath',
                ResultPath: '$.bpath',
                Next: 'c'
            }
        }
    };
    const trajectory = new Trajectory({ ...testOptions, resources });
    const results = await trajectory.execute(definition);
    t.assert(a.calledWith({}));
    t.assert(b.calledWith({
        a: 'a'
    }));
    t.assert(c.calledWith({
        b: 'b'
    }));
    t.deepEqual(results, [
        {},
        {
            'apath': {
                a: 'a'
            }
        },
        {
            'apath': {
                a: 'a'
            },
            'bpath': {
                b: 'b'
            }
        }, {
            'apath': {
                a: 'a'
            },
            'bpath': {
                b: 'b'
            },
            'cpath': {
                c: 'c'
            }
        }
    ]);
});

test('should thread io through states - resultPath + inputPath + outputPath', async t => {
    t.plan(4);
    const a = t.context.sandbox.fake.returns({ a: 'a' });
    const b = t.context.sandbox.fake.returns({ b: 'b' });
    const c = t.context.sandbox.fake.returns({ c: 'c' });
    const resources = { a, b, c };
    const definition = {
        StartAt: 'a',
        States: {
            a: {
                Type: 'Task',
                Resource: 'a',
                ResultPath: '$.apath',
                Next: 'b'
            },
            c: {
                Type: 'Task',
                Resource: 'c',
                InputPath: '$.bpath',
                ResultPath: '$.cpath',
                OutputPath: '$.cpath.c',
                End: true
            },
            b: {
                Type: 'Task',
                Resource: 'b',
                InputPath: '$.apath',
                ResultPath: '$.bpath',
                Next: 'c'
            }
        }
    };
    const trajectory = new Trajectory({ ...testOptions, resources });
    const results = await trajectory.execute(definition);
    t.assert(a.calledWith({}));
    t.assert(b.calledWith({
        a: 'a'
    }));
    t.assert(c.calledWith({
        b: 'b'
    }));
    t.deepEqual(results, [
        {},
        {
            'apath': {
                a: 'a'
            }
        },
        {
            'apath': {
                a: 'a'
            },
            'bpath': {
                b: 'b'
            }
        },
        'c' // TODO: decide whether primitives are allowed as io results
    ]);
});

test('should thread io through states - resultPath + inputPath + outputPath + parameters', async t => {
    t.plan(5);
    const a = t.context.sandbox.fake.returns({ a: 'a' });
    const b = t.context.sandbox.fake.returns({ b: 'b' });
    const c = t.context.sandbox.fake.returns({ c: 'c' });
    const d = t.context.sandbox.fake.returns({ d: 'd' });
    const resources = { a, b, c, d };
    const definition = {
        StartAt: 'a',
        States: {
            a: {
                Type: 'Task',
                Resource: 'a',
                ResultPath: '$.apath',
                Next: 'b'
            },
            c: {
                Type: 'Task',
                Resource: 'c',
                InputPath: '$.bpath',
                ResultPath: '$.cpath',
                OutputPath: '$.cpath',
                Next: 'd'
            },
            b: {
                Type: 'Task',
                Resource: 'b',
                InputPath: '$.apath',
                ResultPath: '$.bpath',
                Next: 'c'
            },
            d: {
                Type: 'Task',
                Resource: 'd',
                Parameters: {
                    'renamedC.$': '$.c'
                },
                //resultPath: '$.dpath',
                End: true
            }
        }
    };
    const trajectory = new Trajectory({ ...testOptions, resources });
    const results = await trajectory.execute(definition);
    t.assert(a.calledWith({}));
    t.assert(b.calledWith({
        a: 'a'
    }));
    t.assert(c.calledWith({
        b: 'b'
    }));
    t.assert(d.calledWith({
        renamedC: 'c'
    }));
    t.deepEqual(results, [
        {},
        {
            'apath': {
                a: 'a'
            }
        },
        {
            'apath': {
                a: 'a'
            },
            'bpath': {
                b: 'b'
            }
        },
        {
            c: 'c'
        },
        {
            d: 'd'
        }
    ]);
});

test('should handle parallel executions', async t => {
    const b = t.context.sandbox.fake.returns({ b: 'b' });
    const c = t.context.sandbox.fake.returns({ c: 'c' });
    const resources = { b, c };
    const definition = {
        StartAt: 'a',
        States: {
            a: {
                Type: 'Parallel',
                Branches: [
                    {
                        StartAt: 'b',
                        States: {
                            b: {
                                Type: 'Task',
                                Resource: 'b',
                                End: true
                            }
                        }
                    },
                    {
                        StartAt: 'c',
                        States: {
                            c: {
                                Type: 'Task',
                                Resource: 'c',
                                End: true
                            }
                        }
                    }
                ],
                Next: 'd'
            },
            d: {
                Type: 'Succeed'
            }
        }
    };
    const trajectory = new Trajectory({ ...testOptions, resources });
    const results = await trajectory.execute(definition);
    t.assert(b.calledWith({}));
    t.assert(c.calledWith({}));
    t.deepEqual(results, [ {}, [ [ { b: 'b' } ], [ { c: 'c' } ] ], [ [ { b: 'b' } ], [ { c: 'c' } ] ] ]);
});

test('choices branch test - 1', async t => {
    const someFooState = t.context.sandbox.fake.returns('hello from foo');
    const someDefaultState = t.context.sandbox.fake.returns('hello from default');
    const resources = { someFooState, someDefaultState };
    const definition = {
        StartAt: 'some choice state',
        States: {
            'some choice state': {
                Type: 'Choice',
                Choices: [
                    {
                        Variable: '$.input',
                        StringEquals: 'foo',
                        Next: 'some foo state'
                    }
                ],
                Default: 'some default state'
            },
            'some foo state': {
                Type: 'Task',
                Resource: someFooState,
                ResultPath: '$.message',
                End: true
            },
            'some default state': {
                Type: 'Task',
                Resource: someDefaultState,
                ResultPath: '$.message',
                End: true
            }
        }
    };
    const trajectory = new Trajectory({ ...testOptions, resources });
    const results = await trajectory.execute(definition, { input: 'foo' });
    t.assert(someFooState.calledWith({ input: 'foo' }));
    t.assert(someDefaultState.callCount === 0);
    t.deepEqual(results, [ { input: 'foo' }, { input: 'foo' }, { input: 'foo', message: 'hello from foo' } ]);
});

test('choices branch test - 2', async t => {
    const someFooState = t.context.sandbox.fake.returns('hello from foo');
    const someDefaultState = t.context.sandbox.fake.returns('hello from default');
    const resources = { someFooState, someDefaultState };
    const definition = {
        StartAt: 'some choice state',
        States: {
            'some choice state': {
                Type: 'Choice',
                Choices: [
                    {
                        Variable: '$.input',
                        StringEquals: 'bar',
                        Next: 'some foo state'
                    }
                ],
                Default: 'some default state'
            },
            'some foo state': {
                Type: 'Task',
                Resource: someFooState,
                ResultPath: '$.message',
                End: true
            },
            'some default state': {
                Type: 'Task',
                Resource: someDefaultState,
                ResultPath: '$.message',
                End: true
            }
        }
    };
    const trajectory = new Trajectory({ ...testOptions, resources });
    const results = await trajectory.execute(definition, { input: 'foo' });
    t.assert(someFooState.callCount === 0);
    t.assert(someDefaultState.calledWith({ input: 'foo' }));
    t.deepEqual(results, [ { input: 'foo' }, { input: 'foo' }, { input: 'foo', message: 'hello from default' } ]);
});

test('choices rule tests - 1', async t => {
    async function run(operation, input, value) {
        const someChosenState = t.context.sandbox.fake.returns(true);
        const someDefaultState = t.context.sandbox.fake.returns(false);
        const definition = {
            StartAt: 'some choice state',
            States: {
                'some choice state': {
                    Type: 'Choice',
                    Choices: [
                        {
                            Variable: '$.input',
                            [operation]: value,
                            Next: 'some chosen state'
                        }
                    ],
                    Default: 'some default state'
                },
                'some chosen state': {
                    Type: 'Task',
                    Resource: someChosenState,
                    End: true
                },
                'some default state': {
                    Type: 'Task',
                    Resource: someDefaultState,
                    End: true
                }
            }
        };
        const trajectory = new Trajectory(testOptions);
        return await trajectory.execute(definition, { input });
    }
    t.deepEqual((await run('BooleanEquals', true, true)).pop(), true);
    t.deepEqual((await run('BooleanEquals', true, false)).pop(), false);
    t.deepEqual((await run('StringEquals', 'foo', 'foo')).pop(), true);
    t.deepEqual((await run('StringEquals', 'bar', 'foo')).pop(), false)
    t.deepEqual((await run('StringLessThan', 'fon', 'foo')).pop(), true);
    t.deepEqual((await run('StringLessThan', 'fop', 'foo')).pop(), false);
    t.deepEqual((await run('StringLessThan', 'foo', 'foo')).pop(), false);
    t.deepEqual((await run('StringLessThanEquals', 'foo', 'foo')).pop(), true);
    t.deepEqual((await run('StringGreaterThan', 'fop', 'foo')).pop(), true);
    t.deepEqual((await run('StringGreaterThan', 'fon', 'foo')).pop(), false);
    t.deepEqual((await run('StringGreaterThan', 'foo', 'foo')).pop(), false);
    t.deepEqual((await run('StringGreaterThanEquals', 'foo', 'foo')).pop(), true);
    t.deepEqual((await run('NumericEquals', 1, 1)).pop(), true);
    t.deepEqual((await run('NumericEquals', 2, 1)).pop(), false);
    t.deepEqual((await run('NumericLessThan', 1, 2)).pop(), true);
    t.deepEqual((await run('NumericLessThan', 2, 1)).pop(), false);
    t.deepEqual((await run('NumericLessThan', 1, 1)).pop(), false);
    t.deepEqual((await run('NumericLessThanEquals', 1, 1)).pop(), true);
    t.deepEqual((await run('NumericGreaterThan', 2, 1)).pop(), true);
    t.deepEqual((await run('NumericGreaterThan', 1, 2)).pop(), false);
    t.deepEqual((await run('NumericGreaterThan', 1, 1)).pop(), false);
    t.deepEqual((await run('NumericGreaterThanEquals', 1, 1)).pop(), true);
    t.deepEqual((await run('TimestampEquals', 'July 4, 2019', 'July 4, 2019')).pop(), true);
    t.deepEqual((await run('TimestampEquals', 'July 4, 2019', 'July 5, 2019')).pop(), false);
    t.deepEqual((await run('TimestampLessThan', 'July 4, 2019', 'July 5, 2019')).pop(), true);
    t.deepEqual((await run('TimestampLessThan', 'July 5, 2019', 'July 4, 2019')).pop(), false);
    t.deepEqual((await run('TimestampLessThan', 'July 4, 2019', 'July 4, 2019')).pop(), false);
    t.deepEqual((await run('TimestampLessThanEquals', 'July 4, 2019', 'July 4, 2019')).pop(), true);
    t.deepEqual((await run('TimestampGreaterThan', 'July 5, 2019', 'July 4, 2019')).pop(), true);
    t.deepEqual((await run('TimestampGreaterThan', 'July 4, 2019', 'July 5, 2019')).pop(), false);
    t.deepEqual((await run('TimestampGreaterThan', 'July 4, 2019', 'July 4, 2019')).pop(), false);
    t.deepEqual((await run('TimestampGreaterThanEquals', 'July 4, 2019', 'July 4, 2019')).pop(), true);
});

test('choices rule tests - 2', async t => {
    async function run(operation, input1, value1, input2, value2) {
        const doorNumber1 = t.context.sandbox.fake.returns(true);
        const doorNumber2 = t.context.sandbox.fake.returns(false);
        const definition = {
            StartAt: 'some choice state',
            States: {
                'some choice state': {
                    Type: 'Choice',
                    Choices: [
                        {
                            [operation]: [
                                {
                                    Variable: '$.input1',
                                    BooleanEquals: value1
                                },
                                {
                                    Variable: '$.input2',
                                    BooleanEquals: value2
                                }
                            ],
                            Next: 'door number 1'
                        }
                    ],
                    Default: 'door number 2'
                },
                'door number 1': {
                    Type: 'Task',
                    Resource: doorNumber1,
                    End: true
                },
                'door number 2': {
                    Type: 'Task',
                    Resource: doorNumber2,
                    End: true
                }
            }
        };
        const trajectory = new Trajectory(testOptions);
        return await trajectory.execute(definition, { input1, input2 });
    }
    t.deepEqual((await run('And', true, true, true, true)).pop(), true);
    t.deepEqual((await run('And', true, true, true, false)).pop(), false);
    t.deepEqual((await run('And', true, true, false, true)).pop(), false);
    t.deepEqual((await run('And', true, false, true, true)).pop(), false);
    t.deepEqual((await run('And', false, true, true, true)).pop(), false);
    t.deepEqual((await run('And', false, false, false, false)).pop(), true);
    t.deepEqual((await run('And', false, false, true, true)).pop(), true);
    t.deepEqual((await run('And', true, true, false, false)).pop(), true);
    t.deepEqual((await run('And', true, false, true, false)).pop(), false);
    t.deepEqual((await run('Or', true, true, true, true)).pop(), true);
    t.deepEqual((await run('Or', true, true, true, false)).pop(), true);
    t.deepEqual((await run('Or', true, true, false, true)).pop(), true);
    t.deepEqual((await run('Or', true, false, true, true)).pop(), true);
    t.deepEqual((await run('Or', false, true, true, true)).pop(), true);
    t.deepEqual((await run('Or', false, false, false, false)).pop(), true);
    t.deepEqual((await run('Or', false, false, true, true)).pop(), true);
    t.deepEqual((await run('Or', true, true, false, false)).pop(), true);
    t.deepEqual((await run('Or', true, false, true, false)).pop(), false);
});

test('choices rule tests - 3', async t => {
    async function run(input, value) {
        const doorNumber1 = t.context.sandbox.fake.returns(true);
        const doorNumber2 = t.context.sandbox.fake.returns(false);
        const definition = {
            StartAt: 'some choice state',
            States: {
                'some choice state': {
                    Type: 'Choice',
                    Choices: [
                        {
                            Not: {
                                Variable: '$.input',
                                BooleanEquals: value
                            },
                            Next: 'door number 1'
                        }
                    ],
                    Default: 'door number 2'
                },
                'door number 1': {
                    Type: 'Task',
                    Resource: doorNumber1,
                    End: true
                },
                'door number 2': {
                    Type: 'Task',
                    Resource: doorNumber2,
                    End: true
                }
            }
        };
        const trajectory = new Trajectory(testOptions);
        return await trajectory.execute(definition, { input });
    }
    t.deepEqual((await run(true, true)).pop(), false);
    t.deepEqual((await run(true, false)).pop(), true);
});

test('params tests - 1', async t => {
    async function run() {
        const foo = t.context.sandbox.fake.returns(true);
        const definition = {
            StartAt: 'my pass',
            States: {
                'my pass': {
                    Type: 'Pass',
                    Parameters: {
                        foo: "bar"
                    },
                    Next: "foo"
                },
                'foo': {
                    Type: 'Task',
                    Resource: foo,
                    End: true
                }
            }
        };
        const trajectory = new Trajectory(testOptions);
        return await trajectory.execute(definition, {});
    }
    const results = await run();
    t.deepEqual(results[1], {foo:"bar"});
});

test.skip('nested parallel', async t => {
    const makeThisPass = {
        "StartAt": "a",
        "States": {
            "a": {
                "Type": "Parallel",
                "Branches": [
                    {
                        "StartAt": "lein.clean",
                        "States": {
                            "lein.clean": {
                                "Type": "Task",
                                "Resource": "lein.clean",
                                "Next": "lein.deps"
                            },
                            "lein.deps": {
                                "Type": "Task",
                                "Resource": "lein.deps",
                                "Next": "lein.npm.install"
                            },
                            "lein.npm.install": {
                                "Type": "Task",
                                "Resource": "lein.npm.install",
                                "Next": "parallel_0"
                            },
                            "parallel_0": {
                                "Type": "Parallel",
                                "Branches": [
                                    {
                                        "StartAt": "lein_0",
                                        "States": {
                                            "lein_0": {
                                                "Type": "Task",
                                                "Parameters": {
                                                    "alias": "apple"
                                                },
                                                "Resource": "lein",
                                                "End": true
                                            }
                                        }
                                    },
                                    {
                                        "StartAt": "lein_1",
                                        "States": {
                                            "lein_1": {
                                                "Type": "Task",
                                                "Parameters": {
                                                    "alias": "banana"
                                                },
                                                "Resource": "lein",
                                                "End": true
                                            }
                                        }
                                    },
                                    {
                                        "StartAt": "lein_2",
                                        "States": {
                                            "lein_2": {
                                                "Type": "Task",
                                                "Parameters": {
                                                    "alias": "cantaloupe"
                                                },
                                                "Resource": "lein",
                                                "End": true
                                            }
                                        }
                                    }
                                ],
                                "Next": "choice_0"
                            },
                            "choice_0": {
                                "Type": "Choice",
                                "Choices": [
                                    {
                                        "BooleanEquals": true,
                                        "Next": "sls.deploy"
                                    }
                                ],
                                "Default": "skip-deploy"
                            },
                            "sls.deploy": {
                                "Type": "Task",
                                "Resource": "sls.deploy",
                                "Parameters": {
                                    "deploy": {
                                        "s": "stage"
                                    }
                                },
                                "End": true
                            },
                            "skip-deploy": {
                                "Type": "Pass",
                                "End": true
                            }
                        }
                    }
                ],
                "OutputPath": "$.0[-1:]",
                "End": true
            }
        }
    };
});

test('smart params', async t => {
    async function run() {
        const definition = {
            "StartAt": "pass_0",
            "States": {
                "pass_0": {
                    "Type": "Pass",
                    "Parameters": {
                        "a": "foo",
                        "b": "bar"
                    },
                    "Next": "pass_1"
                },
                "pass_1": {
                    "Type": "Pass",
                    "Parameters": [
                        "$.a",
                        "$.b"
                    ],
                    "End": true
                }
            }
        };
        const trajectory = new Trajectory(testOptions);
        return await trajectory.execute(definition, {});
    }
    const results = await run();
    t.deepEqual(results[results.length - 1], [ "foo", "bar" ]);
});


