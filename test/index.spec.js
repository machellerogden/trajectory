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
    const definition = {
        kind: 'queue',
        version: '1.0.0',
        spec: {
            startAt: 'a',
            states: {
                a: {
                    type: 'task',
                    fn: a,
                    next: 'b'
                },
                c: {
                    type: 'task',
                    fn: c,
                    end: true
                },
                b: {
                    type: 'task',
                    fn: b,
                    next: 'c'
                }
            }
        }
    };
    const trajectory = new Trajectory(testOptions);
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
    const definition = {
        kind: 'queue',
        version: '1.0.0',
        spec: {
            startAt: 'a',
            states: {
                a: {
                    type: 'task',
                    fn: a,
                    next: 'b'
                },
                c: {
                    type: 'task',
                    fn: c,
                    end: true
                },
                b: {
                    type: 'task',
                    fn: b,
                    next: 'c'
                }
            }
        }
    };
    const trajectory = new Trajectory(testOptions);
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
    const definition = {
        kind: 'queue',
        version: '1.0.0',
        spec: {
            startAt: 'a',
            states: {
                a: {
                    type: 'task',
                    fn: a,
                    resultPath: 'apath',
                    next: 'b'
                },
                c: {
                    type: 'task',
                    fn: c,
                    resultPath: 'cpath',
                    end: true
                },
                b: {
                    type: 'task',
                    fn: b,
                    resultPath: 'bpath',
                    next: 'c'
                }
            }
        }
    };
    const trajectory = new Trajectory(testOptions);
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
    const definition = {
        kind: 'queue',
        version: '1.0.0',
        spec: {
            startAt: 'a',
            states: {
                a: {
                    type: 'task',
                    fn: a,
                    resultPath: 'apath',
                    next: 'b'
                },
                c: {
                    type: 'task',
                    fn: c,
                    inputPath: '$.bpath',
                    resultPath: 'cpath',
                    end: true
                },
                b: {
                    type: 'task',
                    fn: b,
                    inputPath: '$.apath',
                    resultPath: 'bpath',
                    next: 'c'
                }
            }
        }
    };
    const trajectory = new Trajectory(testOptions);
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
    const definition = {
        kind: 'queue',
        version: '1.0.0',
        spec: {
            startAt: 'a',
            states: {
                a: {
                    type: 'task',
                    fn: a,
                    resultPath: 'apath',
                    next: 'b'
                },
                c: {
                    type: 'task',
                    fn: c,
                    inputPath: '$.bpath',
                    resultPath: 'cpath',
                    outputPath: '$.cpath.c',
                    end: true
                },
                b: {
                    type: 'task',
                    fn: b,
                    inputPath: '$.apath',
                    resultPath: 'bpath',
                    next: 'c'
                }
            }
        }
    };
    const trajectory = new Trajectory(testOptions);
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
    const definition = {
        kind: 'queue',
        version: '1.0.0',
        spec: {
            startAt: 'a',
            states: {
                a: {
                    type: 'task',
                    fn: a,
                    resultPath: 'apath',
                    next: 'b'
                },
                c: {
                    type: 'task',
                    fn: c,
                    inputPath: '$.bpath',
                    resultPath: 'cpath',
                    outputPath: '$.cpath',
                    next: 'd'
                },
                b: {
                    type: 'task',
                    fn: b,
                    inputPath: '$.apath',
                    resultPath: 'bpath',
                    next: 'c'
                },
                d: {
                    type: 'task',
                    fn: d,
                    parameters: {
                        'renamedC.$': '$.c'
                    },
                    //resultPath: 'dpath',
                    end: true
                }
            }
        }
    };
    const trajectory = new Trajectory(testOptions);
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
    const definition = {
        kind: 'queue',
        version: '1.0.0',
        spec: {
            startAt: 'a',
            states: {
                a: {
                    type: 'parallel',
                    branches: [
                        {
                            startAt: 'b',
                            states: {
                                b: {
                                    type: 'task',
                                    fn: b,
                                    end: true
                                }
                            }
                        },
                        {
                            startAt: 'c',
                            states: {
                                c: {
                                    type: 'task',
                                    fn: c,
                                    end: true
                                }
                            }
                        }
                    ],
                    next: 'd'
                },
                d: {
                    type: 'succeed'
                }
            }
        }
    };
    const trajectory = new Trajectory(testOptions);
    const results = await trajectory.execute(definition);
    t.assert(b.calledWith({}));
    t.assert(c.calledWith({}));
    t.deepEqual(results, [ {}, [ [ { b: 'b' } ], [ { c: 'c' } ] ], {} ]);
});
