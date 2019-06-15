const { Trajectory } = require('.');
const t = new Trajectory();
const a = () => ({ a: 'a' });
const b = () => ({ b: 'b' });
const c = () => ({ c: 'c' });
const d = () => ({ d: 'd' });
const e = () => ({ e: 'e' });
const f = () => ({ f: 'f' });
const g = () => ({ g: 'g' });
const h = () => ({ g: 'h' });
t.execute({
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
            b: {
                type: 'task',
                fn: b,
                next: 'c'
            },
            c: {
                type: 'task',
                fn: c,
                next: 'parallel'
            },
            parallel: {
                type: 'parallel',
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
                                type: 'task',
                                fn: f,
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
            },
        }
    }
});
