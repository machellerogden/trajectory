import { executeMachine } from '../../index.js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import * as tasks from './tasks.js';
import { thinkingCompanionLogger } from './thinking-reporter.js';

// Get the current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load the state machine definition
const machine = JSON.parse(readFileSync(join(__dirname, 'thinking-companion.json')));

// Define handlers map
const handlers = {
    'appendUserMessage': tasks.appendUserMessage,
    'callLLM': tasks.callLLM,
    'incrementTurns': tasks.incrementTurns,
    'appendMessageToThread': tasks.appendMessageToThread,
    'extractFinalOuterMessage': tasks.extractFinalOuterMessage,
    'generateBehavioralInstructions': tasks.generateBehavioralInstructions,
    'analyzeConversationPatterns': tasks.analyzeConversationPatterns,
    'aggregateSignalsFromResults': tasks.aggregateSignalsFromResults,
    'debugLog': tasks.debugLog
};

/**
 * Execute a thinking companion session
 * @param {string} userInput - The user's input message
 * @param {Object} options - Optional configuration
 * @returns {Promise<[string, Object]>} - [status, output]
 */
export async function runThinkingCompanion(thread, options = {}) {
    if (!thread?.length) {
        throw new Error('Conversation thread is required.');
    }

    const context = {
        handlers,
        quiet: options.quiet !== false, // Default to quiet mode
        log: options.log || thinkingCompanionLogger,
        ...options.context
    };

    const input = {
        thread,
        context: {
            turn_count: 0,
            max_turns: 5,
            ...options.initialContext
        }
    };

    try {
        const [status, output] = await executeMachine(machine, context, input);
        if (options.debug) console.log('OUTPUT', output);
        return [status, output];
    } catch (error) {
        console.error('Thinking companion execution failed:', error.message);
        throw error;
    }
}

// If running directly (not imported)
if (import.meta.url === `file://${process.argv[1]}`) {
    const userInput = process.argv[2] || "What's the best way to learn programming?";

    console.log('🧠 Thinking Companion Starting...');
    console.log('User Input:', userInput);
    console.log('---');

    try {
        const [status, output] = await runThinkingCompanion([{role:"user",content:userInput}], {
            quiet: false,
            debug: true
        });

        // Display final response
        if (output.final_response) {
            console.log('\n✨ Final Response:');
            console.log('─'.repeat(32));
            console.log(output.final_response.content);

            if (output.final_response.type === 'strike-claim') {
                console.log(`\n⚡ Strike-claim triggered by: ${output.final_response.triggered_by?.join(', ')}`);
            }
        } else {
            console.log('\n⚠️ No final response generated');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}
