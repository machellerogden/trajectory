import { callLLM as providerCallLLM } from './providers.js';
import { getSignalClassNames } from './signal-classes.js';

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
    const { provider, model, temperature, max_tokens, prompt, response_format } = params;

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
            prompt,
            response_format
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
        base_max_turns: context.base_max_turns || 5
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
 * Generate behavioral instructions for both voices based on detected signals using prompt dictionary
 */
export function generateBehavioralInstructions({ signals, prompts }) {
    const mode = inferModeFromSignals(signals);
    if (!signals || typeof signals !== 'object' || !prompts) {
        return {
            outer: 'None detected',
            inner: 'None detected',
            adaptations: { maxTokens: null, instruction: 'None detected' }
        };
    }

    const outerInstructions = [];
    const innerInstructions = [];
    const adaptationInstructions = [];

    // Process each signal class and detected signals
    for (const [className, detectedSignals] of Object.entries(signals)) {
        if (!Array.isArray(detectedSignals) || detectedSignals.length === 0) continue;

        for (const signal of detectedSignals) {
            // Build keys for prompt dictionary lookup
            const outerKey = `outer.${className}.${signal}`;
            const innerKey = `inner.${className}.${signal}`;
            const adaptationKey = `adaptation.${signal}`;

            // Collect instructions from prompt dictionary
            if (prompts[outerKey]) {
                outerInstructions.push(`${className}.${signal}: ${prompts[outerKey]}`);
            }
            if (prompts[innerKey]) {
                innerInstructions.push(`${className}.${signal}: ${prompts[innerKey]}`);
            }
            if (prompts[adaptationKey]) {
                adaptationInstructions.push(prompts[adaptationKey]);
            }
        }
    }

    const rhythmTokenGuidance = {
        'stalling': { max: 100, priority: 3 },
        'cognitive-load': { max: 150, priority: 2 },
        'witness-call': { max: 300, priority: 1 }
    };

    let maxTokens = 400;
    let topPriority = 0;

    if (signals.rhythm && Array.isArray(signals.rhythm)) {
        for (const signal of signals.rhythm) {
            const guidance = rhythmTokenGuidance[signal];
            if (guidance && guidance.priority > topPriority) {
                topPriority = guidance.priority;
                maxTokens = guidance.max;
            }
        }
    }

    return {
        outer: outerInstructions.length > 0 ? outerInstructions.join('\n\n') : 'None detected',
        inner: innerInstructions.length > 0 ? innerInstructions.join('\n\n') : 'None detected',
        adaptations: {
            maxTokens: maxTokens,
            instruction: adaptationInstructions.length > 0 ? adaptationInstructions.join(' ') : 'None detected'
        },
        mode
    };
}


/**
 * Aggregate signals from distiller results using proper JSON parsing
 */
export function aggregateSignalsFromResults({ results }) {
    const signalTypes = ['logic', 'stance', 'rhythm', 'affect', 'framing', 'meta'];
    const signals = {};
    const errors = [];

    // Initialize all signal types with empty arrays
    for (const signalType of signalTypes) {
        signals[signalType] = [];
    }

    if (!Array.isArray(results)) {
        errors.push('Results is not an array');
        return { signals, errors, valid: false };
    }

    // Process available results
    for (let i = 0; i < Math.min(results.length, signalTypes.length); i++) {
        const signalType = signalTypes[i];
        try {
            const result = results[i];
            if (result && result.content) {
                const parsed = JSON.parse(result.content);
                signals[signalType] = parsed.signals || [];
            } else {
                signals[signalType] = [];
                errors.push(`Missing content for ${signalType} distiller`);
            }
        } catch (error) {
            signals[signalType] = [];
            errors.push(`Failed to parse ${signalType} signals: ${error.message}`);
        }
    }

    return {
        signals,
        errors,
        valid: errors.length === 0
    };
}

/**
 * Debug logging function
 */
export function debugLog({ message, data }) {
    console.log(`🐛 DEBUG: ${message}`, JSON.stringify(data, null, 2));
    return { logged: true };
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

function inferModeFromSignals(signals) {
    const modeScores = {
        'Analytical': 0,
        'Clarifying': 0,
        'Exploratory': 0,
        'Sequential Reasoning': 0,
        'Relational Presence': 0
    };

    if (!signals || typeof signals !== 'object') return 'Analytical'; // Safe default

    for (const [className, signalList] of Object.entries(signals)) {
        for (const signal of signalList) {
            switch (`${className}.${signal}`) {
                // Analytical
                case 'logic.assumption':
                case 'logic.implication':
                case 'logic.missing-data':
                case 'meta.alignment-gap':
                    modeScores['Analytical'] += 1;
                    break;

                // Clarifying
                case 'rhythm.stalling':
                case 'rhythm.cognitive-load':
                case 'logic.missing-data':
                    modeScores['Clarifying'] += 1;
                    break;

                // Exploratory
                case 'framing.frame':
                case 'framing.tension':
                case 'framing.container':
                    modeScores['Exploratory'] += 1;
                    break;

                // Sequential Reasoning
                case 'stance.overreach':
                case 'meta.mode-drift':
                case 'logic.implication':
                    modeScores['Sequential Reasoning'] += 1;
                    break;

                // Relational Presence
                case 'affect.witness-call':
                case 'affect.valence':
                case 'affect.relational-mode':
                case 'stance.uncertainty':
                    modeScores['Relational Presence'] += 1;
                    break;
            }
        }
    }

    // Pick the highest scoring mode
    const sorted = Object.entries(modeScores).sort((a, b) => b[1] - a[1]);
    return sorted[0][1] > 0 ? sorted[0][0] : 'Analytical';
}
