import { executeMachine } from '../index.js';
import { readFileSync } from 'node:fs';

const machine = JSON.parse(readFileSync('./examples/map.json'));
const handlers = {
    add: ({ a, b }) => a + b
};

try {
    const context = {
        handlers,
        quiet: false
    };

    const input = { items: [ 1, 2, 3 ] };

    // Execute machine w/ context and input
    const [ status, output ] = await executeMachine(machine, context, input);

    console.log('status', status);
    console.log('output', output);

} catch (error) {
    console.error('error', error);
}
