'use strict';

const pauseable = require('pauseable');
const { EventEmitter } = require('events');

const emitter = new EventEmitter();
const emit = data => emitter.emit('data', data);
const error = err => emitter.emit('error', err);

module.exports = {
    emit,
    error,
    start
};

function iter(em) {
    pauseable.resume(em);
    return new Promise((resolve, reject) => {
        em.once('data', data => {
            pauseable.pause(em);
            resolve(data);
        });
        em.once('error', error => {
            pauseable.pause(em);
            reject(error);
        });
    });
}

function* gen (em) {
    while (true) {
        yield iter(em);
    }
}

async function start() {
    for (const data of gen(emitter)) {
        console.log(await data);
    }
}
