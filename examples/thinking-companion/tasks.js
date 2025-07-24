import { callLLM as providerCallLLM } from './providers.js';
import { createDistillerPrompt, validateSignals, createEmptySignals, interpretSignalsForOuterVoice, interpretSignalsForInnerVoice, interpretSignalsForResponseAdaptation, getSignalClassNames } from './signal-classes.js';

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
            model: '4o-mini',
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
 * Aggregate results from consolidated conversation analysis LLM call
 */
export function aggregateConversationAnalysis({ analysisResult, context = {} }) {
    if (!analysisResult) {
        throw new Error('analysisResult is required');
    }

    // Parse comprehensive LLM result
    const analysis = parseLLMResult(analysisResult, {
        stallingRisk: 0,
        recursionDetected: false,
        progressionScore: 0.5,
        thematicLoops: [],
        avoidanceDetected: false,
        hedgingLevel: 'low',
        recommendations: [],
        reasoning: ''
    });

    // Create patterns object in expected format for downstream states
    const patterns = {
        stallingRisk: analysis.stallingRisk,
        recursionDetected: analysis.recursionDetected,
        progressionScore: analysis.progressionScore,
        thematicLoops: analysis.thematicLoops,
        recommendations: analysis.recommendations || []
    };

    // Ensure essential recommendations are included based on analysis
    if (patterns.stallingRisk > 0.6 && patterns.recursionDetected) {
        if (!patterns.recommendations.includes('strike-claim-ready')) {
            patterns.recommendations.push('strike-claim-ready');
        }
    }

    if (analysis.avoidanceDetected || analysis.hedgingLevel === 'high') {
        if (!patterns.recommendations.includes('decision-avoidance')) {
            patterns.recommendations.push('decision-avoidance');
        }
    }

    if (patterns.progressionScore < 0.3) {
        if (!patterns.recommendations.includes('low-progression')) {
            patterns.recommendations.push('low-progression');
        }
    }

    return patterns;
}

/**
 * Parse LLM result with fallback for malformed JSON
 */
function parseLLMResult(llmResult, fallback) {
    try {
        if (!llmResult || !llmResult.content) {
            return fallback;
        }

        let content = llmResult.content.trim();

        // Remove code block markers if present
        if (content.startsWith('```json')) {
            content = content.replace(/```json\s*/, '').replace(/\s*```$/, '');
        } else if (content.startsWith('```')) {
            content = content.replace(/```\s*/, '').replace(/\s*```$/, '');
        }

        const parsed = JSON.parse(content);
        return { ...fallback, ...parsed };
    } catch (error) {
        console.warn('Failed to parse LLM analysis result:', llmResult?.content || 'no content');
        return fallback;
    }
}

/**
 * Analyze conversation patterns for stalling, repetition, and progression
 * DEPRECATED: Replaced by parallel LLM-powered analysis
 *
 * This function is kept for backward compatibility with the MCP tool.
 * The state machine now uses aggregateConversationAnalysis with LLM-powered analysis.
 */
export function analyzeConversationPatterns({ thread = [], context = {} }) {
    // Fallback for MCP tool - simplified pattern detection
    const patterns = {
        stallingRisk: 0,
        recursionDetected: false,
        progressionScore: 0.5,
        thematicLoops: [],
        recommendations: []
    };

    if (thread.length < 3) {
        return patterns;
    }

    // Basic heuristic for MCP tool compatibility
    const userMessages = thread.filter(msg => msg.role === 'user');
    if (userMessages.length >= 2) {
        const lastTwoMessages = userMessages.slice(-2);
        const repeatedWords = findCommonWords(lastTwoMessages);

        if (repeatedWords.length > 2) {
            patterns.stallingRisk = 0.7;
            patterns.recursionDetected = true;
            patterns.thematicLoops = ['analysis-loops'];
            patterns.recommendations = ['strike-claim-ready', 'decision-avoidance'];
        }
    }

    return patterns;
}

/**
 * Simple helper for backward compatibility
 */
function findCommonWords(messages) {
    if (messages.length < 2) return [];

    const words1 = new Set(messages[0].content.toLowerCase().split(/\s+/).filter(w => w.length > 4));
    const words2 = new Set(messages[1].content.toLowerCase().split(/\s+/).filter(w => w.length > 4));

    return [...words1].filter(word => words2.has(word));
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

/**
 * Detect signals in a single input (simplified version of our parallel detection)
 */
async function detectSignalsInInput(input) {
    const allSignals = createEmptySignals();

    // Simulate our parallel signal detection in a simplified synchronous way
    const signalClasses = getSignalClassNames();

    for (const className of signalClasses) {
        // For now, use simple keyword detection instead of LLM calls for speed
        const detectedSignals = detectSignalsSync(className, input);
        allSignals[className] = detectedSignals;
    }

    return allSignals;
}

/**
 * Synchronous signal detection using keyword patterns (faster for MCP tool)
 */
function detectSignalsSync(className, input) {
    const inputLower = input.toLowerCase();
    const detected = [];

    switch (className) {
        case 'logic':
            if (inputLower.includes('assume') || inputLower.includes('presume') || inputLower.includes('given that')) {
                detected.push('assumption');
            }
            if (inputLower.includes('therefore') || inputLower.includes('so if') || inputLower.includes('this means')) {
                detected.push('implication');
            }
            if (inputLower.includes('need to know') || inputLower.includes('missing') || inputLower.includes('unclear')) {
                detected.push('missing-data');
            }
            break;

        case 'stance':
            if (inputLower.includes('definitely') || inputLower.includes('obviously') || inputLower.includes('certainly')) {
                detected.push('overreach');
            }
            if (inputLower.includes('not sure') || inputLower.includes('uncertain') || inputLower.includes('don\'t know')) {
                detected.push('uncertainty');
            }
            if (inputLower.includes('maybe') || inputLower.includes('perhaps') || inputLower.includes('might be')) {
                detected.push('speculation');
            }
            break;

        case 'rhythm':
            if (inputLower.includes('keep thinking') || inputLower.includes('still analyzing') || inputLower.includes('going in circles')) {
                detected.push('stalling');
            }
            if (inputLower.length > 300 || (inputLower.match(/and/g) || []).length > 5) {
                detected.push('cognitive-load');
            }
            break;

        case 'affect':
            if (inputLower.includes('feel') || inputLower.includes('struggling') || inputLower.includes('worried')) {
                detected.push('witness-call');
            }
            break;

        case 'framing':
            if (inputLower.includes('tension') || inputLower.includes('conflict') || inputLower.includes('competing')) {
                detected.push('tension');
            }
            if (inputLower.includes('frame') || inputLower.includes('perspective') || inputLower.includes('way of thinking')) {
                detected.push('frame');
            }
            break;

        case 'meta':
            if (inputLower.includes('process') || inputLower.includes('approach') || inputLower.includes('methodology')) {
                detected.push('alignment-gap');
            }
            break;
    }

    return detected;
}

/**
 * Intelligent recommendation engine that determines intervention types automatically
 */
function determineRecommendations(signals, patterns, currentQuery) {
    const recommendations = [];

    // Priority 1: Strike-claim for high stalling risk
    if (patterns.stallingRisk > 0.6 && patterns.recursionDetected) {
        const strikeClaim = generateStrikeClaim({
            conversationPatterns: patterns,
            userInput: currentQuery,
            context: { turn_count: patterns.stallingRisk } // Use stallingRisk as proxy
        });

        recommendations.push({
            type: 'strike_claim',
            priority: 'high',
            intervention: strikeClaim.content,
            reasoning: 'Detected recursive analysis without meaningful progression',
            confidence: 0.8,
            suggested_delivery: 'direct',
            triggered_by: strikeClaim.triggered_by
        });
    }

    // Priority 2: Validation for witness calls
    if (signals.affect && signals.affect.includes('witness-call')) {
        recommendations.push({
            type: 'validation_support',
            priority: 'high',
            intervention: 'Acknowledge the emotional reality before proceeding with analysis',
            reasoning: 'User expressing emotional need that requires acknowledgment',
            confidence: 0.9,
            suggested_delivery: 'supportive'
        });
    }

    // Priority 3: Assumption tracing for good progression
    if (signals.logic && signals.logic.includes('assumption') && patterns.progressionScore > 0.5) {
        recommendations.push({
            type: 'assumption_tracing',
            priority: 'medium',
            intervention: 'Surface and examine the key assumptions being made',
            reasoning: 'Clear assumptions present with good conversation flow',
            confidence: 0.7,
            suggested_delivery: 'diagnostic'
        });
    }

    // Priority 4: Shadow detection for high exclusion risk
    if (patterns.thematicLoops && patterns.thematicLoops.length > 0) {
        recommendations.push({
            type: 'shadow_detection',
            priority: 'medium',
            intervention: 'Identify what perspectives or factors are being excluded from consideration',
            reasoning: 'Repetitive thematic patterns suggest narrow framing',
            confidence: 0.6,
            suggested_delivery: 'exploratory'
        });
    }

    // Priority 5: Cognitive load management
    if (signals.rhythm && signals.rhythm.includes('cognitive-load')) {
        recommendations.push({
            type: 'simplification',
            priority: 'medium',
            intervention: 'Break down the complexity into smaller, manageable components',
            reasoning: 'High cognitive load detected in user input',
            confidence: 0.7,
            suggested_delivery: 'structured'
        });
    }

    // Failsafe: Check for over-analysis and recommend backing off
    if (patterns.stallingRisk > 0.8 && signals.rhythm && signals.rhythm.includes('cognitive-load')) {
        recommendations.unshift({
            type: 'ease_pressure',
            priority: 'high',
            intervention: 'Step back from analysis and trust your intuition for now',
            reasoning: 'Very high stalling risk combined with cognitive overload - recommend reducing analytical pressure',
            confidence: 0.9,
            suggested_delivery: 'gentle'
        });
    }

    // Default: Exploratory engagement if no strong patterns
    if (recommendations.length === 0) {
        recommendations.push({
            type: 'exploratory_engagement',
            priority: 'low',
            intervention: 'Engage with curiosity and open-ended questions to deepen the inquiry',
            reasoning: 'No strong intervention patterns detected, maintain exploratory stance',
            confidence: 0.5,
            suggested_delivery: 'curious'
        });
    }

    // Sort by priority and confidence
    return recommendations.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return (priorityOrder[b.priority] - priorityOrder[a.priority]) || (b.confidence - a.confidence);
    });
}

/**
 * Generate diagnostic insights based on detected patterns
 */
function generateDiagnosticInsights(signals, patterns, conversationHistory) {
    const insights = {
        key_assumptions: [],
        excluded_perspectives: [],
        cognitive_patterns: [],
        intervention_readiness: {},
        conversation_health: {}
    };

    // Extract key assumptions from conversation
    if (signals.logic && signals.logic.includes('assumption')) {
        insights.key_assumptions = extractAssumptions(conversationHistory);
    }

    // Identify excluded perspectives
    if (patterns.thematicLoops) {
        insights.excluded_perspectives = identifyExclusions(conversationHistory, patterns.thematicLoops);
    }

    // Describe cognitive patterns
    insights.cognitive_patterns = describeCognitivePatterns(patterns);

    // Assess intervention readiness
    insights.intervention_readiness = {
        strike_claim_ready: patterns.stallingRisk > 0.6,
        shadow_work_ready: patterns.thematicLoops.length > 1,
        assumption_work_ready: signals.logic && signals.logic.includes('assumption'),
        validation_needed: signals.affect && signals.affect.includes('witness-call')
    };

    // Conversation health metrics
    insights.conversation_health = {
        progression_score: patterns.progressionScore,
        stalling_risk: patterns.stallingRisk,
        thematic_diversity: patterns.thematicLoops.length,
        turn_efficiency: conversationHistory.length > 0 ? patterns.progressionScore / conversationHistory.length : 0
    };

    return insights;
}

/**
 * Calculate confidence in the analysis based on signal strength and pattern clarity
 */
function calculateConfidence(signals, patterns) {
    let confidence = 0.5; // Base confidence

    // Increase confidence with more detected signals
    const totalSignals = Object.values(signals).flat().length;
    confidence += Math.min(0.3, totalSignals * 0.05);

    // Increase confidence with clear patterns
    if (patterns.recursionDetected) confidence += 0.2;
    if (patterns.stallingRisk > 0.7) confidence += 0.2;
    if (patterns.progressionScore < 0.3 || patterns.progressionScore > 0.7) confidence += 0.1;

    return Math.min(1.0, confidence);
}

/**
 * Helper functions for diagnostic insights
 */
function extractAssumptions(conversationHistory) {
    // Simple extraction of assumption-related content
    const assumptions = [];
    for (const message of conversationHistory) {
        if (message.content && typeof message.content === 'string') {
            const content = message.content.toLowerCase();
            if (content.includes('assume') || content.includes('presume') || content.includes('given that')) {
                // Extract the assumption context
                const sentences = message.content.split('.').filter(s =>
                    s.toLowerCase().includes('assume') ||
                    s.toLowerCase().includes('presume') ||
                    s.toLowerCase().includes('given that')
                );
                assumptions.push(...sentences.map(s => s.trim()));
            }
        }
    }
    return assumptions.slice(0, 3); // Limit to top 3
}

function identifyExclusions(conversationHistory, thematicLoops) {
    // Based on thematic loops, suggest what might be missing
    const commonExclusions = {
        'assumptions': ['emotional factors', 'stakeholder perspectives', 'unintended consequences'],
        'implications': ['long-term effects', 'systemic impacts', 'resource requirements'],
        'stakeholders': ['affected parties', 'decision makers', 'implementation teams'],
        'exclusions': ['alternative approaches', 'constraint factors', 'success metrics']
    };

    const exclusions = [];
    for (const theme of thematicLoops) {
        if (commonExclusions[theme]) {
            exclusions.push(...commonExclusions[theme]);
        }
    }

    return [...new Set(exclusions)].slice(0, 4); // Unique, limit to 4
}

function describeCognitivePatterns(patterns) {
    const descriptions = [];

    if (patterns.stallingRisk > 0.6) {
        descriptions.push('High stalling risk - conversation may be cycling without progression');
    }

    if (patterns.recursionDetected) {
        descriptions.push('Recursive patterns detected - similar themes repeating across turns');
    }

    if (patterns.progressionScore < 0.3) {
        descriptions.push('Low progression - conversation not building on previous insights');
    } else if (patterns.progressionScore > 0.7) {
        descriptions.push('Strong progression - conversation building meaningfully on previous turns');
    }

    if (patterns.thematicLoops.length > 2) {
        descriptions.push(`Multiple thematic loops detected: ${patterns.thematicLoops.join(', ')}`);
    }

    return descriptions;
}
