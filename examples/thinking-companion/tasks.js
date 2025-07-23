import { callLLM as providerCallLLM } from './providers.js';
import { createDistillerPrompt, validateSignals, createEmptySignals } from './signal-classes.js';

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

/**
 * Distills signals from user input for a specific signal class
 */
export async function distillSignals({ signalClass, userInput }) {
    if (!signalClass || !userInput) {
        throw new Error('Signal class and user input are required');
    }

    try {
        const prompt = createDistillerPrompt(signalClass, userInput);
        
        const result = await providerCallLLM({
            provider: 'openai',
            model: 'gpt-4o',
            temperature: 0,
            max_tokens: 50, // Allow more tokens for JSON arrays
            prompt
        });

        // Parse the JSON response (handle code blocks)
        let detectedSignals;
        try {
            let content = result.content.trim();
            
            // Remove code block markers if present
            if (content.startsWith('```json')) {
                content = content.replace(/```json\s*/, '').replace(/\s*```$/, '');
            } else if (content.startsWith('```')) {
                content = content.replace(/```\s*/, '').replace(/\s*```$/, '');
            }
            
            detectedSignals = JSON.parse(content);
        } catch (parseError) {
            console.warn(`Failed to parse signals for ${signalClass}: ${result.content}`);
            detectedSignals = [];
        }

        // Ensure we have an array
        if (!Array.isArray(detectedSignals)) {
            console.warn(`Invalid signal format for ${signalClass}: expected array`);
            detectedSignals = [];
        }

        return {
            signalClass,
            signals: detectedSignals,
            rawResponse: result.content
        };

    } catch (error) {
        console.error(`Signal distillation failed for ${signalClass}:`, error.message);
        return {
            signalClass,
            signals: [],
            error: error.message
        };
    }
}

/**
 * Aggregates results from parallel signal distillers into structured signals object
 */
export function aggregateSignals({ distillerResults }) {
    if (!Array.isArray(distillerResults)) {
        throw new Error('Distiller results must be an array');
    }

    const signals = createEmptySignals();
    const errors = [];

    // Process each distiller result
    for (const result of distillerResults) {
        if (!result || typeof result !== 'object') {
            errors.push('Invalid distiller result format');
            continue;
        }

        const { signalClass, signals: detectedSignals, error } = result;
        
        if (error) {
            errors.push(`${signalClass}: ${error}`);
            continue;
        }

        if (signalClass && Array.isArray(detectedSignals)) {
            signals[signalClass] = detectedSignals;
        }
    }

    // Validate the aggregated signals
    const validation = validateSignals(signals);
    if (!validation.valid) {
        errors.push(...validation.errors);
    }

    return {
        signals,
        errors,
        valid: errors.length === 0
    };
}