#!/usr/bin/env node

/**
 * Test script to verify final turn awareness functionality
 */

import { runThinkingCompanion } from './thinking-companion.js';

async function testFinalTurnAwareness() {
    console.log('🧪 Testing Final Turn Awareness...\n');
    
    try {
        // Test with max_turns = 1 to trigger final turn immediately
        console.log('📝 Test Case: One-turn limit to force immediate final turn awareness');
        console.log('Max turns: 1 (turn 0 = final turn immediately)\n');
        
        const [status, output] = await runThinkingCompanion(
            "What's 2+2?", 
            { 
                quiet: false,
                initialContext: { max_turns: 1 } // Turn 0 is final turn
            }
        );
        
        console.log('\n📊 Test Results:');
        console.log('Status:', status);
        console.log('Total turns:', output.context.turn_count);
        console.log('Max turns:', output.context.max_turns);
        console.log('Final response type:', output.final_response?.type || 'regular');
        
        // Check if we can see evidence of final turn awareness in the conversation
        const thread = output.thread || [];
        console.log('\n🔍 Conversation Analysis:');
        console.log('Total messages in thread:', thread.length);
        
        if (output.context.turn_count >= output.context.max_turns) {
            console.log('✅ Successfully reached max turns - final turn logic should have been triggered');
        } else {
            console.log('ℹ️ Did not reach max turns - voices converged early');
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Stack:', error.stack);
    }
}

testFinalTurnAwareness();