import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { analyzeConversationForMCP } from './tasks.js';

const server = new McpServer({
    name: 'ThinkingCompanion',
    version: '1.0.0'
});

// Helper function to format conversation analysis for Claude Code
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
        } else if (primary.type === 'ease_pressure') {
            lines.push('🛑 **Ease Analytical Pressure:**');
            lines.push(primary.intervention);
            lines.push(`*${primary.reasoning} | Confidence: ${(primary.confidence * 100).toFixed(0)}%*`);
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
    
    return lines.join('\\n');
}

server.tool(
    'contemplate',
    {
        message: z.string().describe('The question or topic to contemplate deeply through outer/inner voice dialogue'),
        options: z.object({
            conversationHistory: z.array(z.object({
                role: z.enum(['user', 'assistant']).describe('The role of the message sender'),
                content: z.string().describe('The message content')
            })).optional().describe('Array of conversation messages for pattern analysis. For longer conversations (>8 turns), consider providing a structured summary that preserves: (1) Turn-by-turn flow with role indicators, (2) Repeated themes/concepts across turns, (3) Hedging language patterns with frequency ("maybe", "perhaps", "might"), (4) Analysis vs. action orientation per turn, (5) Decision avoidance indicators and complexity expansion patterns'),
            maxTokens: z.number().optional().describe('Token limit for LLM responses'),
            temperature: z.number().optional().describe('Temperature override for LLM calls'),
            quiet: z.boolean().optional().describe('Suppress internal logging output')
        }).optional()
    },
    async ({ message, options = {} }) => {
        try {
            // Extract conversation history from options or default to empty array
            const conversationHistory = options.conversationHistory || [];
            
            // Add the current message to the conversation history for analysis
            const fullHistory = [
                ...conversationHistory,
                { role: 'user', content: message }
            ];

            // Perform the conversation analysis using our intelligent tool
            const analysis = await analyzeConversationForMCP({
                conversationHistory: fullHistory,
                currentQuery: message
            });
            
            // Format the response for Claude Code
            const formattedResponse = formatAnalysisOutput(analysis);
            
            return {
                content: [{
                    type: "text",
                    text: formattedResponse
                }]
            };
            
        } catch (error) {
            return {
                content: [{
                    type: "text", 
                    text: `❌ **Error during contemplation**: ${error.message}`
                }]
            };
        }
    }
);

const transport = new StdioServerTransport();
await server.connect(transport);