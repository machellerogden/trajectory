import { readFileSync } from 'node:fs';
import { executeMachine } from '../index.js';
import { StatesError } from '../lib/errors.js';
import { ERROR } from '../lib/constants.js';

const machine = JSON.parse(readFileSync(new URL('./retryCatch.json', import.meta.url)));

let attempt = 0;

const handlers = {
    unstableTask: async () => {
        attempt++;
        if (attempt < 3) {
            // Fail for the first 2 attempts using the proper StatesError
            throw new StatesError(ERROR.States.TaskFailed, 
                `Task failed on attempt #${attempt}`, 
                new Error(`Original error from attempt #${attempt}`)
            );
        }
        // Succeed on the 3rd attempt
        return `Success on attempt #${attempt}`;
    }
};

try {
    const context = { handlers, quiet: false };
    const input = {};

    const [status, output] = await executeMachine(machine, context, input);

    console.log('Status:', status);
    console.log('Output:', output);
} catch (error) {
    console.error('Error:', error);
}
