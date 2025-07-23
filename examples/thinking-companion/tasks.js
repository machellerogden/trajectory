import { callLLM as providerCallLLM } from './providers.js';

/**
 * Appends a user message to the conversation thread
 */
export function appendUserMessage({ thread = [], message }) {
    if (!message || !message.content) {
        throw new Error('Message with content is required');
    }
    
    return [...thread, message];
}

/**
 * Calls an LLM provider with the given parameters
 */
export async function callLLM(params) {
    const { provider, model, temperature, max_tokens, prompt } = params;
    
    if (!provider) {
        throw new Error('Provider is required');
    }
    
    if (!prompt) {
        throw new Error('Prompt is required');
    }

    try {
        const result = await providerCallLLM({
            provider,
            model,
            temperature,
            max_tokens,
            prompt
        });
        
        return result;
    } catch (error) {
        console.error('LLM call failed:', error.message);
        throw error;
    }
}

/**
 * Increments the turn counter in the context
 */
export function incrementTurns({ context = {} }) {
    const currentCount = context.turn_count || 0;
    return {
        ...context,
        turn_count: currentCount + 1
    };
}

/**
 * Appends a message to the conversation thread (generic version)
 */
export function appendMessageToThread({ thread = [], message }) {
    if (!message) {
        throw new Error('Message is required');
    }
    
    return [...thread, message];
}

/**
 * Extracts the final response from the outer voice messages
 */
export function extractFinalOuterMessage({ thread = [] }) {
    // Find the last message from the outer voice
    const outerMessages = thread.filter(msg => msg.role === 'outer');
    if (outerMessages.length === 0) {
        throw new Error('No outer voice messages found in thread');
    }
    
    return outerMessages[outerMessages.length - 1];
}