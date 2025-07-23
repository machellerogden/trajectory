import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { runThinkingCompanion } from './thinking-companion.js';

const server = new McpServer({
    name: 'ThinkingCompanion',
    version: '1.0.0'
});

// Helper function to format thinking companion output for Claude Code
function formatThinkingOutput(output) {
    const lines = [];
    
    // Add signal analysis if available
    if (output.signals) {
        lines.push('🧠 **Signal Analysis:**');
        const { signals, errors } = output.signals;
        
        for (const [className, detectedSignals] of Object.entries(signals)) {
            if (detectedSignals.length > 0) {
                lines.push(`• **${className}**: ${detectedSignals.join(', ')}`);
            }
        }
        
        if (errors && errors.length > 0) {
            lines.push(`• **Validation issues**: ${errors.join('; ')}`);
        }
        
        lines.push(''); // Add spacing
    }
    
    // Add final response
    if (output.final_response?.content) {
        lines.push('💭 **Deep Analysis:**');
        lines.push(output.final_response.content);
    }
    
    // Add context information
    if (output.context?.turn_count) {
        lines.push('');
        lines.push(`*Converged after ${output.context.turn_count} inner dialogue turn(s)*`);
    }
    
    return lines.join('\\n');
}

server.tool(
    'contemplate',
    {
        message: z.string().describe('The question or topic to contemplate deeply through outer/inner voice dialogue'),
        options: z.object({
            maxTokens: z.number().optional().describe('Token limit for LLM responses'),
            temperature: z.number().optional().describe('Temperature override for LLM calls'),
            quiet: z.boolean().optional().describe('Suppress internal logging output')
        }).optional()
    },
    async ({ message, options = {} }) => {
        try {
            // Set default options
            const thinkingOptions = {
                quiet: options.quiet !== false, // Default to quiet mode for MCP
                ...options
            };
            
            // Run the thinking companion
            const [status, output] = await runThinkingCompanion(message, thinkingOptions);
            
            if (status !== 'SUCCEEDED') {
                throw new Error(`Thinking companion execution failed with status: ${status}`);
            }
            
            // Format the response for Claude Code
            const formattedResponse = formatThinkingOutput(output);
            
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