#!/usr/bin/env node

/**
 * Test script for the MCP server integration
 * Simulates how Claude Code would call the thinking companion tool
 */

import { analyzeConversationForMCP } from './tasks.js';

// Test the same conversation that should trigger strike-claim
const testConversation = {
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

// Helper function to format analysis output (matching MCP server format)
function formatAnalysisOutput(analysis) {
    const lines = [];
    
    // Add primary recommendation with high confidence
    const primary = analysis.recommendations[0];
    if (primary) {
        if (primary.type === 'strike_claim') {
            lines.push('⚡ **Strike-Claim Intervention:**');
            lines.push(`"${primary.intervention}"`);
            lines.push(`*Triggered by: ${primary.triggered_by?.join(', ')} | Confidence: ${(primary.confidence * 100).toFixed(0)}%*`);
        } else if (primary.type === 'validation_support') {
            lines.push('🤝 **Validation Support Needed:**');
            lines.push(primary.intervention);
            lines.push(`*Reason: ${primary.reasoning} | Confidence: ${(primary.confidence * 100).toFixed(0)}%*`);
        } else {
            lines.push(`💡 **Recommended Approach (${primary.type}):**`);
            lines.push(primary.intervention);
            lines.push(`*${primary.reasoning} | Confidence: ${(primary.confidence * 100).toFixed(0)}%*`);
        }
        lines.push('');
    }
    
    // Add conversation health metrics
    const health = analysis.diagnostic_insights.conversation_health;
    lines.push('📊 **Conversation Analysis:**');
    lines.push(`• **Stalling Risk**: ${(health.stalling_risk * 100).toFixed(0)}% ${health.stalling_risk > 0.6 ? '⚠️' : ''}`);
    lines.push(`• **Progression Score**: ${(health.progression_score * 100).toFixed(0)}%`);
    if (analysis.analysis.conversation_patterns.thematicLoops.length > 0) {
        lines.push(`• **Thematic Loops**: ${analysis.analysis.conversation_patterns.thematicLoops.join(', ')}`);
    }
    lines.push('');
    
    // Add cognitive patterns if any
    if (analysis.diagnostic_insights.cognitive_patterns.length > 0) {
        lines.push('🧠 **Cognitive Patterns:**');
        analysis.diagnostic_insights.cognitive_patterns.forEach(pattern => {
            lines.push(`• ${pattern}`);
        });
        lines.push('');
    }
    
    // Add secondary recommendations
    if (analysis.recommendations.length > 1) {
        lines.push('🔄 **Additional Approaches:**');
        analysis.recommendations.slice(1, 3).forEach((rec, i) => {
            lines.push(`${i + 2}. **${rec.type}**: ${rec.intervention}`);
        });
        lines.push('');
    }
    
    lines.push(`*Analysis confidence: ${(analysis.meta.analysis_confidence * 100).toFixed(0)}% | Conversation length: ${analysis.meta.conversation_length} turns*`);
    
    return lines.join('\n');
}

async function testMCPServer() {
    console.log('🧪 Testing MCP Server Integration\n');
    
    try {
        // Simulate the MCP tool call
        const fullHistory = [
            ...testConversation.conversationHistory,
            { role: 'user', content: testConversation.currentQuery }
        ];

        console.log('📥 Input:');
        console.log('Current Query:', testConversation.currentQuery);
        console.log('Conversation Length:', fullHistory.length, 'messages');
        console.log('');

        // Perform the analysis
        const analysis = await analyzeConversationForMCP({
            conversationHistory: fullHistory,
            currentQuery: testConversation.currentQuery
        });
        
        // Format the output as the MCP server would
        const formattedOutput = formatAnalysisOutput(analysis);
        
        console.log('📤 MCP Server Output:');
        console.log('---');
        console.log(formattedOutput);
        console.log('---');
        
        // Validate the key result
        if (analysis.recommendations[0]?.type === 'strike_claim') {
            console.log('\n✅ SUCCESS: Strike-claim intervention correctly triggered!');
            console.log('Strike claim:', analysis.recommendations[0].intervention);
        } else {
            console.log('\n❌ ISSUE: Expected strike-claim but got:', analysis.recommendations[0]?.type);
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error.stack);
    }
}

testMCPServer();