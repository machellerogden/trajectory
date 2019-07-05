'use strict';

import test from 'ava';
import sinon from 'sinon';
import { Trajectory } from '..';

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
                ResultPath: 'apath',
                Next: 'b'
            },
            c: {
                Type: 'Task',
                Resource: 'c',
                ResultPath: 'cpath',
                End: true
            },
            b: {
                Type: 'Task',
                Resource: 'b',
                ResultPath: 'bpath',
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
                ResultPath: 'apath',
                Next: 'b'
            },
            c: {
                Type: 'Task',
                Resource: 'c',
                InputPath: '$.bpath',
                ResultPath: 'cpath',
                End: true
            },
            b: {
                Type: 'Task',
                Resource: 'b',
                InputPath: '$.apath',
                ResultPath: 'bpath',
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
                ResultPath: 'apath',
                Next: 'b'
            },
            c: {
                Type: 'Task',
                Resource: 'c',
                InputPath: '$.bpath',
                ResultPath: 'cpath',
                OutputPath: '$.cpath.c',
                End: true
            },
            b: {
                Type: 'Task',
                Resource: 'b',
                InputPath: '$.apath',
                ResultPath: 'bpath',
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
                ResultPath: 'apath',
                Next: 'b'
            },
            c: {
                Type: 'Task',
                Resource: 'c',
                InputPath: '$.bpath',
                ResultPath: 'cpath',
                OutputPath: '$.cpath',
                Next: 'd'
            },
            b: {
                Type: 'Task',
                Resource: 'b',
                InputPath: '$.apath',
                ResultPath: 'bpath',
                Next: 'c'
            },
            d: {
                Type: 'Task',
                Resource: 'd',
                Parameters: {
                    'renamedC.$': '$.c'
                },
                //resultPath: 'dpath',
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
    t.plan(3);
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
