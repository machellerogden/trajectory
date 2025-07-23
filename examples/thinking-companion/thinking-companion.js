import { executeMachine } from '../../index.js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import * as tasks from './tasks.js';

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
    'extractFinalOuterMessage': tasks.extractFinalOuterMessage
};

/**
 * Execute a thinking companion session
 * @param {string} userInput - The user's input message
 * @param {Object} options - Optional configuration
 * @returns {Promise<[string, Object]>} - [status, output]
 */
export async function runThinkingCompanion(userInput, options = {}) {
    if (!userInput || typeof userInput !== 'string') {
        throw new Error('User input is required and must be a string');
    }

    const context = {
        handlers,
        quiet: options.quiet !== false, // Default to quiet mode
        ...options.context
    };

    const input = {
        user_input: userInput,
        thread: [], // Start with empty conversation thread
        context: {
            turn_count: 0,
            max_turns: 3,
            ...options.initialContext
        }
    };

    try {
        const [status, output] = await executeMachine(machine, context, input);
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
        const [status, output] = await runThinkingCompanion(userInput, { quiet: false });
        
        console.log('---');
        console.log('Status:', status);
        console.log('Final Response:');
        console.log(output.final_response?.content || 'No final response generated');
        
        if (output.thread) {
            console.log('\n🧵 Internal Dialogue Thread:');
            output.thread.forEach((msg, i) => {
                const roleIcon = msg.role === 'user' ? '👤' : 
                                msg.role === 'outer' ? '🗣️' : 
                                msg.role === 'inner' ? '💭' : '🤖';
                console.log(`${i + 1}. ${roleIcon} ${msg.role}: ${msg.content}`);
            });
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}