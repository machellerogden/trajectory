//async function * subGen() {
    //return yield await 'What is your favorite color?';
//}

//async function * gen() {
    //while (true) {
        //const reply = yield* await subGen();
        //console.log(reply);
        //if (reply !== 'yellow') return await 'Wrong!'
        //return await 'You may pass.';
    //}
//}

//(async () => {
    //const iter = gen();
    //const q = (await iter.next()).value;
    //console.log(q);
    //const a = (await iter.next('blue')).value;
    //console.log(a);
//})();

//(async () => {
    //const iter = gen();
    //const q = (await iter.next()).value;
    //console.log(q);
    //const a = (await iter.next('yellow')).value;
    //console.log(a);
//})();

const { Cancel } = require('./lib/cancel');

function sleep(ms, whenCancelled) {
    return new Promise((resolve, reject) => {
        setTimeout(() => resolve('success'), ms);
        whenCancelled.then(() => reject(new Error('cancelled')));
    });
}

(async () => {

    const c = new Cancel();

    async function* loop() {
        while (true) {
            yield await c.cancellable(whenCancelled => sleep(1000, whenCancelled));
        }
    }

    setTimeout(() => c.cancelAll(), 5000);

    for await (const result of loop()) {
        console.log(result);
    }

})();
