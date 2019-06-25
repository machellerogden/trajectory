async function * subGen() {
    return yield await 'What is your favorite color?';
}

async function * gen() {
    while (true) {
        const reply = yield* await subGen();
        console.log(reply);
        if (reply !== 'yellow') return await 'Wrong!'
        return await 'You may pass.';
    }
}

(async () => {
    const iter = gen();
    const q = (await iter.next()).value;
    console.log(q);
    const a = (await iter.next('blue')).value;
    console.log(a);
})();

(async () => {
    const iter = gen();
    const q = (await iter.next()).value;
    console.log(q);
    const a = (await iter.next('yellow')).value;
    console.log(a);
})();
