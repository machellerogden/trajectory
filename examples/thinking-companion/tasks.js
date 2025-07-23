import { callLLM as providerCallLLM } from './providers.js';
import { createDistillerPrompt, validateSignals, createEmptySignals, interpretSignalsForOuterVoice, interpretSignalsForInnerVoice, interpretSignalsForResponseAdaptation } from './signal-classes.js';

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
 * Increments the turn counter in the context and updates dynamic max turns based on rhythm signals
 */
export function incrementTurns({ context = {}, signals = {} }) {
    const currentCount = context.turn_count || 0;
    const newCount = currentCount + 1;
    
    // Calculate dynamic max turns based on rhythm signals
    let maxTurns = context.base_max_turns || 3; // Default base
    
    if (signals && signals.rhythm && Array.isArray(signals.rhythm)) {
        for (const rhythmSignal of signals.rhythm) {
            switch (rhythmSignal) {
                case 'stalling':
                    maxTurns = Math.min(maxTurns, 2); // Reduce for stalling
                    break;
                case 'cognitive-load':
                    maxTurns = Math.max(maxTurns, 5); // Extend for complexity
                    break;
                case 'flow':
                    maxTurns = Math.max(maxTurns, 4); // Allow natural progression
                    break;
                case 'pacing':
                    // Keep current max turns - natural rhythm
                    break;
            }
        }
    }
    
    return {
        ...context,
        turn_count: newCount,
        max_turns: maxTurns,
        base_max_turns: context.base_max_turns || 3
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

/**
 * Generate behavioral instructions for both voices based on detected signals
 */
export function generateBehavioralInstructions({ signals }) {
    if (!signals || typeof signals !== 'object') {
        return {
            outer: null,
            inner: null,
            adaptations: { maxTokens: null, instruction: null }
        };
    }

    const outerInstructions = interpretSignalsForOuterVoice(signals);
    const innerInstructions = interpretSignalsForInnerVoice(signals);
    const adaptations = interpretSignalsForResponseAdaptation(signals);

    return {
        outer: outerInstructions,
        inner: innerInstructions,
        adaptations: adaptations
    };
}

/**
 * Analyze conversation patterns for stalling, repetition, and progression
 */
export function analyzeConversationPatterns({ thread = [], context = {} }) {
    const patterns = {
        stallingRisk: 0,        // 0-1 scale of stalling likelihood
        recursionDetected: false, // Boolean for repetitive patterns
        progressionScore: 0.5,   // 0-1 scale of insight progression
        thematicLoops: [],       // Array of detected recurring themes
        recommendations: []      // Suggested interventions
    };

    if (thread.length < 4) {
        // Not enough conversation to detect patterns
        return patterns;
    }

    // Analyze for repetitive themes and concepts
    const outerMessages = thread.filter(msg => msg.role === 'outer' || msg.role === 'assistant');
    const innerMessages = thread.filter(msg => msg.role === 'inner');

    if (outerMessages.length >= 2) {
        // Check for thematic repetition in outer voice
        const themes = extractThemes(outerMessages);
        const repeatedThemes = findRepeatedThemes(themes);
        
        if (repeatedThemes.length > 0) {
            patterns.thematicLoops = repeatedThemes;
            patterns.recursionDetected = true;
            patterns.stallingRisk = Math.min(1.0, patterns.stallingRisk + 0.3);
        }

        // Check for assumption repetition (sign of cycling)
        const assumptionCount = countAssumptionMentions(outerMessages);
        if (assumptionCount > 3 && outerMessages.length <= 3) {
            patterns.stallingRisk = Math.min(1.0, patterns.stallingRisk + 0.2);
            patterns.recommendations.push('assumption-overanalysis');
        }
    }

    // Analyze progression vs. cycling
    if (outerMessages.length >= 2) {
        const progressionAnalysis = analyzeProgression(outerMessages);
        patterns.progressionScore = progressionAnalysis.score;
        
        if (progressionAnalysis.score < 0.3) {
            patterns.stallingRisk = Math.min(1.0, patterns.stallingRisk + 0.4);
            patterns.recommendations.push('low-progression');
        }
    }

    // Check for decision avoidance patterns
    const avoidancePatterns = detectDecisionAvoidance(outerMessages);
    if (avoidancePatterns.detected) {
        patterns.stallingRisk = Math.min(1.0, patterns.stallingRisk + 0.3);
        patterns.recommendations.push('decision-avoidance');
    }

    // Final stalling assessment
    if (patterns.stallingRisk > 0.6) {
        patterns.recommendations.push('strike-claim-ready');
    }

    return patterns;
}

/**
 * Extract key themes from messages for repetition analysis
 */
function extractThemes(messages) {
    const themes = [];
    
    for (const message of messages) {
        const content = message.content.toLowerCase();
        
        // Look for key assumption words
        if (content.includes('assumption') || content.includes('presume') || content.includes('assume')) {
            themes.push('assumptions');
        }
        
        // Look for implication analysis
        if (content.includes('implication') || content.includes('consequence') || content.includes('follows')) {
            themes.push('implications');
        }
        
        // Look for exclusion/missing analysis
        if (content.includes('missing') || content.includes('excluded') || content.includes('absent')) {
            themes.push('exclusions');
        }
        
        // Look for stakeholder mentions
        if (content.includes('stakeholder') || content.includes('perspective') || content.includes('viewpoint')) {
            themes.push('stakeholders');
        }
    }
    
    return themes;
}

/**
 * Find themes that repeat across messages
 */
function findRepeatedThemes(themes) {
    const counts = {};
    for (const theme of themes) {
        counts[theme] = (counts[theme] || 0) + 1;
    }
    
    return Object.keys(counts).filter(theme => counts[theme] > 2);
}

/**
 * Count mentions of assumptions across messages
 */
function countAssumptionMentions(messages) {
    let count = 0;
    for (const message of messages) {
        const content = message.content.toLowerCase();
        const matches = content.match(/assumption|assume|presume|presumption/g);
        if (matches) {
            count += matches.length;
        }
    }
    return count;
}

/**
 * Analyze whether conversation is progressing or cycling
 */
function analyzeProgression(messages) {
    if (messages.length < 2) {
        return { score: 0.5 };
    }

    const lastMessage = messages[messages.length - 1].content;
    const previousMessages = messages.slice(0, -1);
    
    // Check for new concepts in latest message
    const newConcepts = hasNewConcepts(lastMessage, previousMessages);
    const buildsOnPrevious = buildsonPreviousInsights(lastMessage, previousMessages);
    
    let score = 0.5; // Neutral baseline
    
    if (newConcepts) score += 0.3;
    if (buildsOnPrevious) score += 0.2;
    
    // Penalty for pure repetition
    if (hasHighOverlap(lastMessage, previousMessages)) {
        score -= 0.4;
    }
    
    return { score: Math.max(0, Math.min(1, score)) };
}

/**
 * Check if latest message introduces new concepts
 */
function hasNewConcepts(latestMessage, previousMessages) {
    const latestWords = new Set(latestMessage.toLowerCase().split(/\s+/));
    const previousWords = new Set();
    
    for (const msg of previousMessages) {
        for (const word of msg.content.toLowerCase().split(/\s+/)) {
            previousWords.add(word);
        }
    }
    
    const newWords = [...latestWords].filter(word => 
        word.length > 4 && !previousWords.has(word)
    );
    
    return newWords.length > 3; // Has substantial new vocabulary
}

/**
 * Check if latest message builds on previous insights
 */
function buildsonPreviousInsights(latestMessage, previousMessages) {
    const latest = latestMessage.toLowerCase();
    
    // Look for building language
    const buildingPhrases = [
        'expanding on', 'building upon', 'in addition to', 'furthermore',
        'moreover', 'extending this', 'deepening', 'additional'
    ];
    
    return buildingPhrases.some(phrase => latest.includes(phrase));
}

/**
 * Check for high overlap indicating repetition
 */
function hasHighOverlap(latestMessage, previousMessages) {
    const latestWords = new Set(latestMessage.toLowerCase().split(/\s+/));
    
    for (const msg of previousMessages) {
        const msgWords = new Set(msg.content.toLowerCase().split(/\s+/));
        const overlap = [...latestWords].filter(word => msgWords.has(word));
        const overlapRatio = overlap.length / latestWords.size;
        
        if (overlapRatio > 0.7) { // High overlap threshold
            return true;
        }
    }
    
    return false;
}

/**
 * Detect patterns indicating decision avoidance
 */
function detectDecisionAvoidance(messages) {
    const analysis = { detected: false, patterns: [] };
    
    for (const message of messages) {
        const content = message.content.toLowerCase();
        
        // Look for hedging language
        const hedgingPhrases = [
            'might be', 'could be', 'possibly', 'perhaps', 'maybe',
            'it depends', 'various factors', 'multiple considerations'
        ];
        
        const hedgingCount = hedgingPhrases.filter(phrase => 
            content.includes(phrase)
        ).length;
        
        if (hedgingCount > 2) {
            analysis.detected = true;
            analysis.patterns.push('excessive-hedging');
        }
        
        // Look for complexity without direction
        if (content.includes('complex') && content.includes('consider') && 
            !content.includes('recommend') && !content.includes('suggest')) {
            analysis.detected = true;
            analysis.patterns.push('complexity-without-direction');
        }
    }
    
    return analysis;
}

/**
 * Generate a direct strike-claim intervention based on detected stalling patterns
 */
export function generateStrikeClaim({ userInput, conversationPatterns, context }) {
    const strikeClaims = {
        'assumption-overanalysis': [
            "You're dissecting assumptions that are already clear. Move forward.",
            "This assumption analysis is stalling. What's the real question?", 
            "You already know what you're assuming. What are you avoiding?"
        ],
        'low-progression': [
            "You're cycling through the same analysis without moving deeper.",
            "This isn't complexity. It's hesitation dressed as rigor.",
            "You're analyzing instead of deciding. What's the real block?"
        ],
        'decision-avoidance': [
            "You already know what you want. You're stalling.",
            "All this 'it depends' is avoiding the choice you need to make.",
            "You're using complexity to delay a decision that's simpler than you're making it."
        ],
        'excessive-hedging': [
            "Drop the maybe. What do you actually think?",
            "Enough hedging. Take a position.",
            "You're hiding behind uncertainty. What's your actual view?"
        ],
        'general-stalling': [
            "You're stuck in analysis mode. What action does this point toward?",
            "This exploration has hit a loop. What's the real question underneath?",
            "You're thinking in circles. What would move this forward?"
        ]
    };

    // Determine which type of strike claim to use based on patterns
    let selectedClaims = strikeClaims['general-stalling']; // Default
    
    if (conversationPatterns.recommendations) {
        for (const recommendation of conversationPatterns.recommendations) {
            if (strikeClaims[recommendation]) {
                selectedClaims = strikeClaims[recommendation];
                break;
            }
        }
    }

    // Select a random strike claim from the appropriate category
    const claimIndex = Math.floor(Math.random() * selectedClaims.length);
    const selectedClaim = selectedClaims[claimIndex];

    return {
        content: selectedClaim,
        type: 'strike-claim',
        triggered_by: conversationPatterns.recommendations || ['general-stalling'],
        stalling_risk: conversationPatterns.stallingRisk
    };
}

/**
 * Check convergence conditions and determine next action
 */
export function checkConvergence({ innerResponse, context }) {
    // Check if inner voice agreed
    if (innerResponse && innerResponse.content && innerResponse.content.trim().toLowerCase() === 'agree') {
        return { action: 'final_response', reason: 'inner_voice_agreement' };
    }

    // Check if we've reached max turns
    const turnCount = context.turn_count || 0;
    const maxTurns = context.max_turns || 3;
    
    if (turnCount >= maxTurns) {
        return { action: 'final_response', reason: 'max_turns_reached', turn_count: turnCount, max_turns: maxTurns };
    }

    // Continue with strike claim check
    return { action: 'check_strike_claim', turn_count: turnCount, max_turns: maxTurns };
}