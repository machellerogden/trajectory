import { readFileSync } from 'node:fs';
import { executeMachine } from '../index.js';

const machine = JSON.parse(readFileSync(new URL('./helloWorld.json', import.meta.url)));

const handlers = {
    sayHello: async (input) => {
        // If input provides a 'name', greet them by name
        const name = input?.name ?? 'World';
        return `Hello, ${name}!`;
    },
};

try {
    const context = { handlers, quiet: false };
    const input = { name: 'Trajectory' };

    const [status, output] = await executeMachine(machine, context, input);

    console.log('Status:', status);
    console.log('Output:', output);
} catch (error) {
    console.error('Error:', error);
}
