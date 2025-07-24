#!/usr/bin/env node

/**
 * Quick test to verify the final response is being displayed by the logger
 */

import { runThinkingCompanion } from './thinking-companion.js';

async function testFinalResponse() {
    console.log('🧪 Testing final response display...\n');
    
    try {
        // Test with a query that should reach max turns quickly
        const [status, output] = await runThinkingCompanion(
            "I need help with something simple", 
            { 
                quiet: false,
                initialContext: { max_turns: 1 } // Force early termination
            }
        );
        
        console.log('\n📊 Test Results:');
        console.log('Status:', status);
        console.log('Has final_response:', !!output.final_response);
        console.log('Final response object:', JSON.stringify(output.final_response, null, 2));
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testFinalResponse();