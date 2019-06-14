'use strict';

module.exports = { Scheduler, exec };

const { MAX_EVENT_COUNT } = require('./constants');
const { sleep } = require('./util');
const { clone } = require('mediary');

async function* Scheduler(queue, io) {
    const { startAt, states } = queue;
    async function* loop(state) {
        const next = () => state = states[state.next];
        let count = 0;
        while (count < MAX_EVENT_COUNT) {
            count++;
            try {
                switch (state.type) {
                    case 'task':
                        io = await state.fn(await io)
                        yield io;
                        if (state.end) return;
                        next();
                        break;
                    case 'pass':
                        if (state.result != null) {
                            yield await state.result
                        } else {
                            yield io;
                        }
                        next();
                        break;
                    case 'wait':
                        await sleep(state.seconds);
                        if (state.seconds) yield io;
                        next();
                        break;
                    case 'succeed':
                        yield io;
                        return;
                    case 'fail':
                        yield io;
                        console.error('fail');
                        process.exit(1);
                    case 'parallel':
                        io = await Promise.all(state.branches.map(branch => exec(branch, clone(io))));
                        yield io;
                        next();
                        break;
                    case 'choice':
                        // TODO
                    default:
                        break;

                }
            } catch (e) {
                console.error('bad', e);
            }
        }
    }
    yield* await loop(states[startAt]);
}

async function exec(queue, input, ee) {
    let results = [];
    for await (const result of Scheduler(queue, input)) {
        ee.emit(result);
        results.push(result);
    }
    return results;
}
