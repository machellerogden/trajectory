'use strict';

const { EventEmitter } = require('events');
const get = require('lodash/get');
const { clone } = require('mediary');

const { schema } = require('./lib/schema');
const { sleep } = require('./lib/util');
const defaultReporter = require('./lib/reporter');

class Trajectory extends EventEmitter {

    constructor({
        debug = false,
        reporter = defaultReporter
    } = {}) {
        super();
        this.reporter = reporter;
        this.indent = 0;
        this.indentCols = 4;
        this.on('event', ({ messageType, name, data }) => {
            this.reporter[messageType]({ name, data, indent: this.indent });
        });
    }

    async execute(definition, input) {
        const { spec:queue } = await schema.validate(definition);
        const results = [];
        for await (const result of this.schedule(queue, input)) {
            results.push(result);
        }
        return results;
    }

    async * schedule(queue, io) {
        const { startAt, states } = queue;
        const $this = this;

        async function* loop(state, start) {
            let name; 

            if (start) {
                name = start;
                state = state[start];
            }

            function next() {
                name = state.next;
                state = states[state.next];
            }

            function emit(messageType, data) {
                $this.emit('event', { messageType, name, data });
            }

            function * output(data) {
                yield { name, data };
            }

            while (true) {
                emit('start');
                try {
                    switch (state.type) {
                        case 'task': {
                            io = await state.fn(await io)
                            yield* output(io);
                            emit('succeed', io);
                            if (state.end) return;
                            next();
                            break;
                        }
                        case 'pass':
                            if (state.result != null) {
                                io = await state.result;
                            }
                            yield* output(io);
                            emit('succeed', io);
                            next();
                            break;
                        case 'wait':
                            if (state.seconds) {
                                await sleep(state.seconds);
                            } else if (state.secondsPath) {
                                await sleep(get(io, state.secondsPath));
                            }
                            yield* output(io);
                            emit('succeed', io);
                            next();
                            break;
                        case 'succeed':
                            yield* output(io);
                            emit('succeed', io);
                            return;
                        case 'fail': {
                            const err = { name, io };
                            if (state.error) err.error = state.error;
                            if (state.cause) err.cause = state.cause;
                            yield* output(err);
                            emit('fail', err);
                            return;
                        }
                        case 'parallel':
                            $this.indent += $this.indentCols;
                            io = await Promise.all(state.branches.map(branch => $this.executeBranch(branch, clone(io))));
                            $this.indent -= $this.indentCols;
                            yield* output(io);
                            emit('succeed', io);
                            if (state.end) return;
                            next();
                            break;
                        case 'choice':
                            // TODO
                            break;
                        default: {
                            const err = { message: `\`type\` of "${state.type}" for "${name}" not found.` };
                            yield* output(err);
                            emit('fail', err);
                            break;
                        }

                    }
                } catch (e) {
                    yield* output(e);
                    emit('fail', e);
                    return;
                }
            }
        }
        yield * await loop(states, startAt);
    }

    async executeBranch(queue, input) {
        const results = [];
        for await (const result of this.schedule(queue, input)) {
            results.push(result.data);
        }
        return results;
    }
}

module.exports = { Trajectory };
