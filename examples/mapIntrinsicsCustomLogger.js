import { readFileSync } from 'node:fs';
import { inspect } from 'node:util';
import { executeMachine } from '../index.js';

function customLogger(...args) {
    console.log(inspect(args, { depth: null, colors: true }));
}

const machine = JSON.parse(readFileSync(new URL('./mapIntrinsics.json', import.meta.url)));

try {
    const context = {
        handlers: {
            transformHandler: async (input) => input
        },
        quiet: false,
        log: customLogger
    };
    const input = { numbers: [1, 2, 3, 4, 5] };

    const [status, output] = await executeMachine(machine, context, input);

    console.log('Status:', status);
    console.log('Output:', output);
    // Expected: [
    //   { original: 1, squared: 2 },
    //   { original: 2, squared: 8 },
    //   { original: 3, squared: 18 },
    //   { original: 4, squared: 32 },
    //   { original: 5, squared: 50 }
    // ]
} catch (error) {
    console.error('Error:', error);
}
