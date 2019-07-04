const { Trajectory } = require('.');
const t = new Trajectory();

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

(async () => {
    const results = await t.execute({
        kind: 'queue',
        version: '1.0.0',
        spec: {
            startAt: 'parallelA',
            states: {
                parallelA: {
                    type: 'parallel',
                    branches: [
                        {
                            startAt: 'a',
                            states: {
                                a: {
                                    type: 'task',
                                    fn: a,
                                    resultPath: 'a',
                                    //timeoutSeconds: 0.3,
                                    end: true
                                },
                            }
                        },
                        {
                            startAt: 'aa',
                            states: {
                                aa: {
                                    type: 'task',
                                    fn: aa,
                                    resultPath: 'aa',
                                    catch: [
                                        {
                                            errorEquals: [ 'Error' ],
                                            resultPath: 'myerror',
                                            next: 'bb'
                                        }
                                    ],
                                    end: true
                                },
                                bb: {
                                    type: 'task',
                                    fn: v => ({ recovered: v}),
                                    end: true
                                }
                            }
                        }
                    ],
                    next: 'b'
                },
                b: {
                    type: 'task',
                    fn: b,
                    resultPath: 'bbb',
                    retry: [
                        {
                            errorEquals: [ 'Error' ],
                            maxAttempts: 6,
                            intervalSeconds: 0.25,
                            backoffRate: 2
                        }
                    ],
                    next: 'c'
                },
                c: {
                    type: 'task',
                    fn: c,
                    resultPath: 'ccc',
                    next: 'parallel'
                },
                parallel: {
                    type: 'parallel',
                    //outputPath: '$.1.0',
                    branches: [
                        {
                            startAt: 'd',
                            states: {
                                d: {
                                    type: 'task',
                                    fn: d,
                                    next: 'e'
                                },
                                e: {
                                    //type: 'fail',
                                    //error: 'messed up',
                                    //cause: 'human error'
                                    type: 'task',
                                    fn: e,
                                    end: true
                                }
                            }
                        },
                        {
                            startAt: 'f',
                            states: {
                                f: {
                                    type: 'task',
                                    fn: f,
                                    next: 'z'
                                },
                                z: {
                                    type: 'wait',
                                    seconds: 3,
                                    next: 'g'
                                },
                                g: {
                                    type: 'task',
                                    fn: g,
                                    end: true
                                }
                            }
                        }
                    ],
                    next: 'h'
                },
                h: {
                    type: 'task',
                    fn: h,
                    end: true
                }
            }
        }
    });
})();
