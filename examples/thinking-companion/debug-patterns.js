import { analyzeConversationForMCP } from './tasks.js';

// Debug the stalling conversation
const stallingConversation = {
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

async function debugPatterns() {
    console.log("🔍 Debugging Pattern Detection\n");
    
    try {
        const result = await analyzeConversationForMCP(stallingConversation);
        
        console.log("📊 Full Analysis Results:");
        console.log("Conversation Length:", result.meta.conversation_length);
        console.log("Detected Signals:", result.analysis.detected_signals);
        console.log("Conversation Patterns:", result.analysis.conversation_patterns);
        console.log("Stalling Risk:", result.analysis.stalling_risk);
        console.log("Recursion Detected:", result.analysis.conversation_patterns.recursionDetected);
        console.log("Thematic Loops:", result.analysis.conversation_patterns.thematicLoops);
        console.log("Progression Score:", result.analysis.progression_score);
        console.log("Recommendations:", result.analysis.conversation_patterns.recommendations);
        
        // Debug decision avoidance detection
        console.log("\n🔍 Decision Avoidance Debug:");
        const allMessages = stallingConversation.conversationHistory;
        console.log("All messages content:");
        allMessages.forEach((msg, i) => {
            console.log(`${i + 1}. (${msg.role}): ${msg.content}`);
        });
        
        console.log("\n📈 Diagnostic Insights:");
        console.log("Cognitive Patterns:", result.diagnostic_insights.cognitive_patterns);
        console.log("Intervention Readiness:", result.diagnostic_insights.intervention_readiness);
        
        console.log("\n💡 Recommendations:");
        result.recommendations.forEach((rec, i) => {
            console.log(`${i + 1}. ${rec.type} (${rec.priority}): ${rec.intervention}`);
            console.log(`   Reason: ${rec.reasoning}`);
            console.log(`   Confidence: ${rec.confidence}`);
        });
        
    } catch (error) {
        console.error("Error:", error.message);
        console.error(error.stack);
    }
}

debugPatterns();