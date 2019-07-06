const { Trajectory } = require('.');

const a = async (input, onCancel) => new Promise((resolve, reject) => {
    const handle = setTimeout(() => resolve({ a: 'a' }), 1000);
    onCancel(reason => {
        clearTimeout(handle);
        reject(reason);
    });
});

const aa = async (input, onCancel) => new Promise((resolve, reject) => {
    //const handle = setTimeout(() => resolve({ aa: 'aa' }), 500);
    const handle = setTimeout(() => reject(new Error('boom')), 500);
    onCancel(reason => {
        clearTimeout(handle);
        reject(reason);
    });
});

let i = 0;
const b = () => {
    if (i++ < 5) {
        throw new Error('bad things happen');
    } else {
        return { b: 'b' };
    }
};

const c = () => ({ c: 'c' });
const d = () => ({ d: 'd' });
const e = () => ({ e: 'e' });
const f = () => ({ f: 'f' });
const g = () => ({ g: 'g' });
//const g = () => Promise.reject();
const h = v => v;

const resources = {
    a,
    b,
    c,
    d,
    e,
    f,
    g,
    h
};

const t = new Trajectory({ resources });

(async () => {
    const results = await t.execute({
        StartAt: 'parallelA',
        States: {
            parallelA: {
                Type: 'Parallel',
                Branches: [
                    {
                        StartAt: 'a',
                        States: {
                            a: {
                                Type: 'Task',
                                Resource: 'a',
                                ResultPath: 'a',
                                //timeoutSeconds: 0.3,
                                End: true
                            },
                        }
                    },
                    {
                        StartAt: 'aa',
                        States: {
                            aa: {
                                Type: 'Task',
                                Resource: aa,
                                ResultPath: 'aa',
                                Catch: [
                                    {
                                        ErrorEquals: [ 'Error' ],
                                        ResultPath: 'myerror',
                                        Next: 'bb'
                                    }
                                ],
                                End: true
                            },
                            bb: {
                                Type: 'Task',
                                Resource: v => ({ recovered: v}),
                                End: true
                            }
                        }
                    }
                ],
                Next: 'b'
            },
            b: {
                Type: 'Task',
                Resource: 'b',
                ResultPath: 'bbb',
                Retry: [
                    {
                        ErrorEquals: [ 'Error' ],
                        MaxAttempts: 6,
                        IntervalSeconds: 0.25,
                        BackoffRate: 2
                    }
                ],
                Next: 'c'
            },
            c: {
                Type: 'Task',
                Resource: 'c',
                ResultPath: 'ccc',
                Next: 'parallel'
            },
            parallel: {
                Type: 'Parallel',
                //outputPath: '$.1.0',
                Branches: [
                    {
                        StartAt: 'd',
                        States: {
                            d: {
                                Type: 'Task',
                                Resource: 'd',
                                Next: 'e'
                            },
                            e: {
                                //type: 'fail',
                                //error: 'messed up',
                                //cause: 'human error'
                                Type: 'Task',
                                Resource: 'e',
                                End: true
                            }
                        }
                    },
                    {
                        StartAt: 'f',
                        States: {
                            f: {
                                Type: 'Task',
                                Resource: 'f',
                                Next: 'z'
                            },
                            z: {
                                Type: 'Wait',
                                Seconds: 3,
                                Next: 'g'
                            },
                            g: {
                                Type: 'Task',
                                Resource: 'g',
                                End: true
                            }
                        }
                    }
                ],
                Next: 'h'
            },
            h: {
                Type: 'Task',
                Resource: 'h',
                Next: 'i'
            },
            i: {
                Type: 'Choice',
                Choices: [
                    {
                        Variable: '$.1.0.f',
                        StringEquals: 'f',
                        Next: 'choice-one'
                    }
                ],
                Default: 'choice-three'
            },
            'choice-one': {
                Type: 'Task',
                Resource: v => 'excellent choice',
                End: true
            },
            'choice-two': {
                Type: 'Task',
                Resource: v => 'poor choice',
                End: true
            },
            'choice-three': {
                Type: 'Task',
                Resource: v => "how'd we end up here",
                End: true
            }
        }
    });
})();
