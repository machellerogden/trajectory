const CancellationContext = require('cancellation-context');

function sleep(ms, cancelled) {
    return new Promise((resolve, reject) => {
        const t = setTimeout(() => {
            console.log('done');
            resolve('success');
        }, ms);
        cancelled.then(error => {
            clearTimeout(t);
            reject(error);
        });
    });
}

(async () => {

    const c = new CancellationContext();

    async function* loop() {
        while (true) {
            let i = 1;
            yield await Promise.all(Array.from({ length: 3 }, () => c.cancellable(({ cancelled }) => sleep(500 * i++, cancelled))));
        }
    }

    setTimeout(() => c.cancelAll(), 4000);

    try {
        for await (const result of loop()) {
            console.log(result);
        }
    } catch (e) {
        console.error('Boom!', e);
    }

})();
