import { analyzeConversationForMCP } from './tasks.js';
import { getSignalClassNames, createEmptySignals } from './signal-classes.js';

/**
 * Test script for the MCP tool function
 */

// Test Case 1: Simple conversation with uncertainty
const testCase1 = {
    conversationHistory: [
        { role: "user", content: "Should I take this new job offer?" },
        { role: "assistant", content: "What factors are you considering in this decision?" },
        { role: "user", content: "I'm not sure. Maybe the salary is better, but perhaps the culture won't be as good." }
    ],
    currentQuery: "I keep going back and forth on this decision. Maybe I should think about it more?"
};

// Test Case 2: Stalling conversation with repetitive analysis
const testCase2 = {
    conversationHistory: [
        { role: "user", content: "I want to start a business but I keep analyzing all the factors" },
        { role: "assistant", content: "What specific factors are you analyzing?" },
        { role: "user", content: "Well, I need to consider the market, and maybe think about the competition, and perhaps evaluate the financial aspects" },
        { role: "assistant", content: "You mentioned market analysis - what have you discovered?" },
        { role: "user", content: "I keep thinking about the various market factors and possibly need to analyze the competitive landscape more" },
        { role: "assistant", content: "It sounds like you're covering similar ground. What's your sense of the market opportunity?" },
        { role: "user", content: "I'm still analyzing the market conditions and maybe should consider additional factors" }
    ],
    currentQuery: "I think I need to keep analyzing these business factors and perhaps consider even more aspects of this decision"
};

// Test Case 3: Emotional expression needing validation
const testCase3 = {
    conversationHistory: [
        { role: "user", content: "I've been struggling with this decision for weeks" },
        { role: "assistant", content: "What aspects of the decision are most challenging?" }
    ],
    currentQuery: "I feel like I'm going in circles and I'm worried I'll never figure this out"
};

async function runTests() {
    console.log("🧪 Testing MCP Tool Function\n");
    
    console.log("📝 Test Case 1: Uncertainty and speculation");
    console.log("Current Query:", testCase1.currentQuery);
    try {
        const result1 = await analyzeConversationForMCP(testCase1);
        console.log("Analysis:", JSON.stringify(result1, null, 2));
        console.log("Top Recommendation:", result1.recommendations[0]);
    } catch (error) {
        console.error("Error:", error.message);
    }
    
    console.log("\n" + "=".repeat(80) + "\n");
    
    console.log("📝 Test Case 2: Stalling and repetitive analysis (should trigger strike-claim)");
    console.log("Current Query:", testCase2.currentQuery);
    try {
        const result2 = await analyzeConversationForMCP(testCase2);
        console.log("Stalling Risk:", result2.analysis.stalling_risk);
        console.log("Cognitive Patterns:", result2.diagnostic_insights.cognitive_patterns);
        console.log("Top Recommendation:", result2.recommendations[0]);
        
        if (result2.recommendations[0]?.type === 'strike_claim') {
            console.log("✅ Strike-claim correctly recommended!");
            console.log("Strike-claim message:", result2.recommendations[0].intervention);
        }
    } catch (error) {
        console.error("Error:", error.message);
    }
    
    console.log("\n" + "=".repeat(80) + "\n");
    
    console.log("📝 Test Case 3: Emotional expression (should recommend validation)");
    console.log("Current Query:", testCase3.currentQuery);
    try {
        const result3 = await analyzeConversationForMCP(testCase3);
        console.log("Detected Signals:", result3.analysis.detected_signals);
        console.log("Top Recommendation:", result3.recommendations[0]);
        
        if (result3.recommendations[0]?.type === 'validation_support') {
            console.log("✅ Validation correctly recommended!");
        }
    } catch (error) {
        console.error("Error:", error.message);
    }
}

// Run the tests
runTests().catch(console.error);