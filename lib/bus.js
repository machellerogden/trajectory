const pauseable = require('pauseable');
const { EventEmitter } = require('events');

function iter(em) {
    pauseable.resume(em);
    return new Promise((resolve) => {
        em.once('foo', (data) => {
            pauseable.pause(em);
            resolve(data);
        });
    });
}

function * gen (em) {
    while (true) {
        yield iter(em);
    }
}

async function start() {
    const emitter = new EventEmitter();
    const ws = new WebSocket('wss://stream.binance.com:9443/ws/etcbtc@aggTrade');
    ws.onmessage = ({ data }) => emitter.emit('foo', data);
    for (const data of gen(emitter)) {
        console.log(await data);
    }
}

start();
