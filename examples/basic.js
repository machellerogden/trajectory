import { executeMachine } from '../index.js';
import { readFileSync } from 'node:fs';

// Machine definitions are JSON objects that define the state machine's structure.
const machine = JSON.parse(readFileSync('./examples/basic.json'));

// Define a map of named handlers
const handlers = {
    'greet': async (name) => `Hello, ${name}!`,
    'dismiss': async (name) => `Goodbye, ${name}!`
};

try {

    // Context is an object that contains the state machine's execution environment.
    const context = {

        // Add named handlers to context
        handlers,

        // show step-by-step execution log
        quiet: false

    };

    // Define the initial input value for this execution of the state machine.
    const input = { name: 'Mac' };

    // Execute machine w/ context and input
    const [ status, output ] = await executeMachine(machine, context, input);

    console.log('status', status);
    console.log('output', output);

} catch (error) {
    console.error('error', error);
}
