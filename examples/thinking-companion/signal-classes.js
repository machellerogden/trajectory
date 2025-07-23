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