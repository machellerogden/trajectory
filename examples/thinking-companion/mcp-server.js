import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { runThinkingCompanion } from './thinking-companion.js';

const server = new McpServer({
    name: 'ThinkingCompanion',
    version: '1.0.0'
});

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
            const conversationHistory = options.conversationHistory || [];
            const quiet = options.quiet || false;
            const [status, output] = await runThinkingCompanion(message, {
                quiet,
                initialContext: { max_turns: 5 },
                context: {
                    thread: conversationHistory ?? [] // full conversation thread
                }
            });

            const finalResponse = formatFinalResponse(output, quiet);

            return {
                content: [{ type: "text", text: finalResponse }]
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

function formatFinalResponse(output, quiet) {
    let finalResponse = output.final_response?.content || '(no final response)';
    if (quiet) return finalResponse;
    let dialog = output.thread.reduce((dialogText, turn) => {
        let rolePrefix = turn.role === 'user' ? 'User: ' : 'Assistant: ';
        let content = turn.content || '(no content)';
        return dialogText + `${rolePrefix}${content}\n`;
    }, '');
    let turnCount = output.context?.turn_count || 0;
    let maxTurns = output.context?.max_turns || 5;
    let summary = `\n\n---\n\n**Conversation Summary**:\nTotal Turns: ${turnCount}/${maxTurns}\n\n${dialog}`;

    return `${finalResponse}${summary}`;
}

const transport = new StdioServerTransport();
await server.connect(transport);
