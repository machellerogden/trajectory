import { readFileSync } from 'node:fs';
import { executeMachine } from '../index.js';

const machine = JSON.parse(readFileSync(new URL('./choiceExample.json', import.meta.url)));

const handlers = {
    serveDrink: async (input) => {
        return 'Enjoy responsibly!';
    },
    denyDrink: async (input) => {
        return 'Sorry, you are not old enough to be served alcohol.';
    }
};

try {
    const context = { handlers, quiet: false };

    // Try changing 'age' to 21 or higher to see the other branch
    const input = { age: 19 };

    const [status, output] = await executeMachine(machine, context, input);

    console.log('Status:', status);
    console.log('Output:', output);
} catch (error) {
    console.error('Error:', error);
}
