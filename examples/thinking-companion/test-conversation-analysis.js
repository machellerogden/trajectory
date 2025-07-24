#!/usr/bin/env node

/**
 * Test script for the consolidated conversation analysis
 */

import { aggregateConversationAnalysis, callLLM } from './tasks.js';

// Mock LLM response for testing aggregation
const mockAnalysisResult = {
    content: `{
        "stallingRisk": 0.8,
        "recursionDetected": true,
        "progressionScore": 0.3,
        "thematicLoops": ["analysis-loops", "decision-avoidance"],
        "avoidanceDetected": true,
        "hedgingLevel": "high",
        "recommendations": ["strike-claim-ready", "decision-avoidance"],
        "reasoning": "User shows clear patterns of recursive analysis with high hedging language and requests for more analysis without making progress."
    }`
};

// Test conversation for actual LLM analysis
const testConversation = [
    { role: "user", content: "I keep analyzing whether I should take this new job offer" },
    { role: "assistant", content: "What specific factors are you considering?" },
    { role: "user", content: "Maybe the salary is better, but perhaps the culture won't be good. Should I keep thinking about it more?" }
];

async function testConversationAnalysis() {
    console.log('🧪 Testing Consolidated Conversation Analysis\n');
    
    // Test 1: Aggregation function with mock data
    console.log('📝 Test 1: Aggregation with mock LLM result');
    try {
        const patterns = aggregateConversationAnalysis({ 
            analysisResult: mockAnalysisResult,
            context: { turn_count: 3 }
        });
        
        console.log('✅ Aggregation successful:');
        console.log('  Stalling Risk:', patterns.stallingRisk);
        console.log('  Recursion Detected:', patterns.recursionDetected);
        console.log('  Progression Score:', patterns.progressionScore);
        console.log('  Thematic Loops:', patterns.thematicLoops);
        console.log('  Recommendations:', patterns.recommendations);
        
        if (patterns.stallingRisk > 0.6 && patterns.recommendations.includes('strike-claim-ready')) {
            console.log('✅ Strike-claim correctly identified!');
        }
        
    } catch (error) {
        console.error('❌ Aggregation failed:', error.message);
    }
    
    console.log('\n' + '='.repeat(60) + '\n');
    
    // Test 2: Actual LLM call with consolidated prompt
    console.log('📝 Test 2: Consolidated LLM analysis call');
    try {
        const conversationText = JSON.stringify(testConversation);
        
        const prompt = `Analyze this conversation comprehensively for patterns and intervention needs.

Conversation history: ${conversationText}

Analyze for:

1. STALLING PATTERNS:
   - Recursive analysis without meaningful progression
   - Analysis paralysis or cycling without resolution
   - Repetitive themes that don't deepen

2. PROGRESSION QUALITY:
   - Are new insights building on previous ones?
   - Is conversation advancing or cycling?
   - Quality of turn-to-turn development

3. THEMATIC LOOPS:
   - Repeated themes across multiple turns
   - Conceptual cycling (assumptions, implications, analysis)
   - Topics that repeat without resolution

4. DECISION AVOIDANCE:
   - Excessive hedging language (maybe, perhaps, might)
   - Complexity introduced to delay decisions
   - Requests for more analysis when sufficient exists

Return JSON only:
{
  "stallingRisk": 0.0-1.0,
  "recursionDetected": boolean,
  "progressionScore": 0.0-1.0,
  "thematicLoops": ["theme1", "theme2"],
  "avoidanceDetected": boolean,
  "hedgingLevel": "low|medium|high",
  "recommendations": ["strike-claim-ready", "decision-avoidance"],
  "reasoning": "brief explanation of key patterns detected"
}`;

        console.log('🔄 Calling LLM with consolidated prompt...');
        
        const llmResult = await callLLM({
            provider: 'openai',
            model: 'gpt-4o',
            temperature: 0.1,
            max_tokens: 400,
            prompt: prompt
        });
        
        console.log('✅ LLM call successful!');
        console.log('Raw response:', llmResult.content);
        
        // Test aggregation with real LLM result
        const patterns = aggregateConversationAnalysis({ 
            analysisResult: llmResult,
            context: { turn_count: 3 }
        });
        
        console.log('\n📊 Final aggregated patterns:');
        console.log('  Stalling Risk:', patterns.stallingRisk);
        console.log('  Recursion Detected:', patterns.recursionDetected);
        console.log('  Progression Score:', patterns.progressionScore);
        console.log('  Thematic Loops:', patterns.thematicLoops);
        console.log('  Recommendations:', patterns.recommendations);
        
        if (patterns.stallingRisk > 0.6 && patterns.recommendations.includes('strike-claim-ready')) {
            console.log('✅ Consolidated analysis correctly identifies strike-claim readiness!');
        }
        
    } catch (error) {
        console.error('❌ LLM analysis failed:', error.message);
        console.error(error.stack);
    }
}

testConversationAnalysis();