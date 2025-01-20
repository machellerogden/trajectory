import { readFileSync } from 'node:fs';
import { executeMachine } from '../index.js';

const machine = JSON.parse(readFileSync(new URL('./parallelExample.json', import.meta.url)));

const handlers = {
  branchOneTask: async (input) => `Output from branch 1`,
  branchTwoTask: async (input) => `Output from branch 2`
};

try {
  const context = { handlers, quiet: false };
  const input = {};

  const [status, output] = await executeMachine(machine, context, input);

  console.log('Status:', status);
  console.log('Output:', output);
  // Expected shape: [ "Output from branch 1", "Output from branch 2" ]
} catch (error) {
  console.error('Error:', error);
}
