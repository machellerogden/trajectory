/**
 * Signal Classes for Thinking Companion
 * 
 * Each signal class represents a dimension of analysis with specific aspects
 * that can be detected in user input and used to guide response generation.
 */

export const SIGNAL_CLASSES = {
    logic: {
        description: "Reasoning quality assessment",
        signals: ["assumption", "implication", "missing-data"],
        definitions: {
            assumption: "Unstated assumptions or premises",
            implication: "Logical consequences or follow-through",
            "missing-data": "Information gaps or needed evidence"
        }
    },
    
    stance: {
        description: "Epistemic positioning", 
        signals: ["overreach", "uncertainty", "speculation"],
        definitions: {
            overreach: "Claims beyond available evidence",
            uncertainty: "Acknowledging unknowns or limits",
            speculation: "Hypothetical or exploratory reasoning"
        }
    },
    
    rhythm: {
        description: "Cognitive flow management",
        signals: ["stalling", "pacing", "flow", "cognitive-load"],
        definitions: {
            stalling: "Hesitation, blockage, or delay patterns",
            pacing: "Speed and timing of information delivery",
            flow: "Smoothness of progression and transitions",
            "cognitive-load": "Mental processing burden or complexity"
        }
    },
    
    affect: {
        description: "Emotional and relational tone",
        signals: ["valence", "relational-mode", "witness-call"],
        definitions: {
            valence: "Positive/negative emotional charge or sentiment",
            "relational-mode": "How to connect and engage with user",
            "witness-call": "Need for validation, support, or acknowledgment"
        }
    },
    
    framing: {
        description: "Perspective and context setting",
        signals: ["frame", "tension", "container"],
        definitions: {
            frame: "Conceptual boundaries, lens, or worldview",
            tension: "Competing forces, conflicts, or trade-offs",
            container: "Safe space for exploration or vulnerability"
        }
    },
    
    meta: {
        description: "System-level awareness",
        signals: ["mode-drift", "alignment-gap", "trigger-match"],
        definitions: {
            "mode-drift": "Deviation from intended approach or style",
            "alignment-gap": "Mismatch between intent and execution",
            "trigger-match": "Recognition of sensitive or significant topics"
        }
    }
};

/**
 * Get all signal classes as an array
 */
export function getSignalClassNames() {
    return Object.keys(SIGNAL_CLASSES);
}

/**
 * Get all possible signals for a given class
 */
export function getSignalsForClass(className) {
    return SIGNAL_CLASSES[className]?.signals || [];
}

/**
 * Validate that detected signals are valid for their class
 */
export function validateSignals(detectedSignals) {
    const errors = [];
    
    for (const [className, signals] of Object.entries(detectedSignals)) {
        if (!SIGNAL_CLASSES[className]) {
            errors.push(`Unknown signal class: ${className}`);
            continue;
        }
        
        const validSignals = SIGNAL_CLASSES[className].signals;
        const invalidSignals = signals.filter(signal => !validSignals.includes(signal));
        
        if (invalidSignals.length > 0) {
            errors.push(`Invalid signals for ${className}: ${invalidSignals.join(', ')}`);
        }
    }
    
    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Create an empty signals object with all classes
 */
export function createEmptySignals() {
    const signals = {};
    for (const className of getSignalClassNames()) {
        signals[className] = [];
    }
    return signals;
}

/**
 * Format signals for display
 */
export function formatSignalsForDisplay(signals) {
    const formatted = [];
    
    for (const [className, detectedSignals] of Object.entries(signals)) {
        if (detectedSignals.length > 0) {
            formatted.push(`${className}: ${detectedSignals.join(', ')}`);
        }
    }
    
    return formatted.length > 0 ? formatted.join(' | ') : 'none detected';
}

/**
 * Create distiller prompt for a specific signal class
 */
export function createDistillerPrompt(className, userInput) {
    const signalClass = SIGNAL_CLASSES[className];
    if (!signalClass) {
        throw new Error(`Unknown signal class: ${className}`);
    }
    
    const signalList = signalClass.signals.map(signal => {
        const definition = signalClass.definitions[signal];
        return `${signal} (${definition})`;
    }).join(', ');
    
    return `Analyze the user input for ${className} signals. Detect any of: ${signalList}.

Return a JSON array of detected signals like ["signal1", "signal2"] or [] if none detected. Use only the exact signal names provided.

User input: "${userInput}"`;
}

/**
 * Signal-to-behavior mappings for the outer voice (diagnostic companion)
 */
const OUTER_VOICE_BEHAVIORS = {
    logic: {
        assumption: "Focus diagnostic energy on assumption tracing. Surface what's taken as given without examination.",
        implication: "Trace logical consequences methodically. What follows if this holds? What are the second-order effects?",
        "missing-data": "Identify information gaps precisely. What evidence is needed to evaluate this claim?"
    },
    stance: {
        overreach: "Exercise heightened epistemic humility. Test claim boundaries aggressively. Resist overconfident assertions.",
        uncertainty: "Acknowledge unknowns explicitly. Use 'I don't know' when appropriate. Distinguish data from inference.",
        speculation: "Distinguish clearly between data, inference, and speculation. Mark exploratory reasoning as such."
    },
    rhythm: {
        stalling: "Use brevity to create movement. Focus on one core diagnostic question. Consider strike-claim readiness.",
        "cognitive-load": "Reduce complexity. Break down into simpler diagnostic components. Use clearer structure.",
        pacing: "Match the user's information processing speed. Adjust depth accordingly.",
        flow: "Support smooth progression. Build on previous insights without repetition."
    },
    affect: {
        "witness-call": "Provide spacious acknowledgment first. Validate without rushing to diagnostic work.",
        valence: "Attune to emotional tone while maintaining diagnostic rigor. Adjust intensity appropriately.",
        "relational-mode": "Calibrate engagement style to relational needs while preserving epistemic stance."
    },
    framing: {
        frame: "Examine conceptual boundaries. What worldview or lens is operating here? What's included/excluded?",
        tension: "Surface competing forces explicitly. Hold paradox without premature resolution.",
        container: "Create safe space for vulnerable exploration while maintaining diagnostic precision."
    },
    meta: {
        "mode-drift": "Recalibrate to diagnostic stance immediately. Return to assumption-exposing, claim-testing positioning.",
        "alignment-gap": "Address mismatch between stated intent and execution. Surface the disconnect.",
        "trigger-match": "Recognize sensitive terrain. Proceed with diagnostic work while respecting the stakes."
    }
};

/**
 * Signal-to-behavior mappings for the inner voice (shadow detector)
 */
const INNER_VOICE_BEHAVIORS = {
    logic: {
        assumption: "What foundational assumption is invisible here? What's being taken as obviously true?",
        implication: "What consequences are being ignored? What follows that hasn't been considered?",
        "missing-data": "What crucial information is absent? What questions aren't being asked?"
    },
    stance: {
        overreach: "What claims exceed the available evidence? Where is certainty masking uncertainty?",
        uncertainty: "What unknowns are being glossed over? Where should doubt be more explicit?",
        speculation: "What's being presented as fact that's actually inference or speculation?"
    },
    rhythm: {
        stalling: "Is this diagnostic work moving toward insight or cycling in place? Are we avoiding something?",
        "cognitive-load": "Is the complexity serving clarity or creating confusion? What's essential vs. elaborate?",
        pacing: "Is the rhythm matching the user's capacity or pushing beyond it?",
        flow: "Are we building coherently or jumping between disconnected observations?"
    },
    affect: {
        "witness-call": "What emotional need is present but unaddressed? What requires acknowledgment before analysis?",
        valence: "What emotional reality is being excluded from this frame? What feeling is being avoided?",
        "relational-mode": "How is the relational dynamic affecting the inquiry? What's the underlying connection need?"
    },
    framing: {
        frame: "What perspectives are excluded from this worldview? Who or what is rendered invisible?",
        tension: "What opposing forces are being overlooked? What contradiction is being smoothed over?",
        container: "What vulnerability or risk is this safe space meant to hold? What's the underlying need?"
    },
    meta: {
        "mode-drift": "Are we maintaining diagnostic rigor or slipping into pleasing? Where's the epistemic edge?",
        "alignment-gap": "What's the disconnect between espoused values and actual behavior in this response?",
        "trigger-match": "What sensitive element requires more careful attention? What's at stake that we're not naming?"
    }
};

/**
 * Signal-to-adaptation mappings for response calibration
 */
const RESPONSE_ADAPTATIONS = {
    rhythm: {
        "cognitive-load": { 
            maxTokens: 150, 
            instruction: "Use shorter, clearer responses. Break complex ideas into digestible pieces." 
        },
        stalling: { 
            maxTokens: 100, 
            instruction: "Be brief and direct. Create space for movement rather than filling it with analysis." 
        },
        pacing: { 
            maxTokens: null, // Use default
            instruction: "Match the user's information processing rhythm." 
        },
        flow: { 
            maxTokens: null, // Use default
            instruction: "Support natural progression without forcing artificial structure." 
        }
    },
    affect: {
        "witness-call": {
            maxTokens: 200,
            instruction: "Allow space for acknowledgment and validation. Don't rush to problem-solving."
        }
    },
    stance: {
        uncertainty: {
            maxTokens: null, // Use default
            instruction: "Be comfortable with 'I don't know' and partial answers. Resist false certainty."
        }
    }
};

/**
 * Interpret detected signals for outer voice behavioral instructions
 */
export function interpretSignalsForOuterVoice(signals) {
    const instructions = [];
    
    for (const [className, detectedSignals] of Object.entries(signals)) {
        if (!Array.isArray(detectedSignals) || detectedSignals.length === 0) continue;
        
        const classBehaviors = OUTER_VOICE_BEHAVIORS[className];
        if (!classBehaviors) continue;
        
        for (const signal of detectedSignals) {
            const behavior = classBehaviors[signal];
            if (behavior) {
                instructions.push(`${className}.${signal}: ${behavior}`);
            }
        }
    }
    
    return instructions.length > 0 ? instructions.join('\n\n') : null;
}

/**
 * Interpret detected signals for inner voice behavioral instructions  
 */
export function interpretSignalsForInnerVoice(signals) {
    const instructions = [];
    
    for (const [className, detectedSignals] of Object.entries(signals)) {
        if (!Array.isArray(detectedSignals) || detectedSignals.length === 0) continue;
        
        const classBehaviors = INNER_VOICE_BEHAVIORS[className];
        if (!classBehaviors) continue;
        
        for (const signal of detectedSignals) {
            const behavior = classBehaviors[signal];
            if (behavior) {
                instructions.push(`${className}.${signal}: ${behavior}`);
            }
        }
    }
    
    return instructions.length > 0 ? instructions.join('\n\n') : null;
}

/**
 * Interpret detected signals for response adaptation (token limits, etc.)
 */
export function interpretSignalsForResponseAdaptation(signals) {
    const adaptations = {
        maxTokens: null,
        instructions: []
    };
    
    // Process rhythm signals first (they have token limit implications)
    if (signals.rhythm && Array.isArray(signals.rhythm)) {
        for (const signal of signals.rhythm) {
            const adaptation = RESPONSE_ADAPTATIONS.rhythm[signal];
            if (adaptation) {
                if (adaptation.maxTokens !== null) {
                    // Use the most restrictive token limit if multiple rhythm signals
                    if (adaptations.maxTokens === null || adaptation.maxTokens < adaptations.maxTokens) {
                        adaptations.maxTokens = adaptation.maxTokens;
                    }
                }
                adaptations.instructions.push(adaptation.instruction);
            }
        }
    }
    
    // Process other signal classes for additional instructions
    for (const [className, detectedSignals] of Object.entries(signals)) {
        if (className === 'rhythm' || !Array.isArray(detectedSignals)) continue;
        
        const classAdaptations = RESPONSE_ADAPTATIONS[className];
        if (!classAdaptations) continue;
        
        for (const signal of detectedSignals) {
            const adaptation = classAdaptations[signal];
            if (adaptation && adaptation.instruction) {
                adaptations.instructions.push(adaptation.instruction);
            }
        }
    }
    
    return {
        maxTokens: adaptations.maxTokens,
        instruction: adaptations.instructions.length > 0 ? adaptations.instructions.join(' ') : null
    };
}