const { Trajectory } = require('.');
const t = new Trajectory();
const a = async () => Promise.resolve({ a: 'a' });
//const b = () => ({ b: 'b' });
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
const h = v => v;
(async () => {
    const results = await t.execute({
        kind: 'queue',
        version: '1.0.0',
        spec: {
            startAt: 'a',
            states: {
                a: {
                    type: 'task',
                    fn: a,
                    resultPath: 'aaa',
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
                                    //type: 'fail',
                                    //error: 'messed up',
                                    //cause: 'human error'
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
