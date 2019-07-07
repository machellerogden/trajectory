const { Trajectory } = require('.');

const a = async (input, onCancel) => new Promise((resolve, reject) => {
    const handle = setTimeout(() => resolve({ a: 'a' }), 1000);
    onCancel(reason => {
        clearTimeout(handle);
        reject(reason);
    });
});

const aa = async (input, onCancel) => new Promise((resolve, reject) => {
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

const bb = v => ({ recovered: v});

const c = () => ({ c: 'c' });
const d = () => ({ d: 'd' });
const e = () => ({ e: 'e' });
const f = () => ({ f: 'f' });
const g = () => ({ g: 'g' });
const h = v => v;

const excellent = v => "excellent choice";
const poor = v => "poor choice";
const what = v => "how'd we end up here";

const resources = {
    a,
    aa,
    b,
    bb,
    c,
    d,
    e,
    f,
    g,
    h,
    excellent,
    poor,
    what
};

const t = new Trajectory({ resources });

const definition = require('./sandbox.json');

(async () => {
    const results = await t.execute(definition);
})();
