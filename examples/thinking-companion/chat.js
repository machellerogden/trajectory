import { createInterface } from 'node:readline';
import chalk from 'chalk';
import { runThinkingCompanion } from './thinking-companion.js';

class ThinkingCompanionChat {
    constructor(options = {}) {
        this.options = {
            showInternalDialogue: options.showInternalDialogue ?? true,
            quiet: options.quiet ?? true,
            ...options
        };

        this.rl = createInterface({
            input: process.stdin,
            output: process.stdout,
            prompt: '💭 You: '
        });

        this.conversationHistory = [];
    }

    async start() {
        console.log('🧠 Welcome to the Thinking Companion!');
        console.log('This AI uses internal dialogue between an outer and inner voice to provide thoughtful responses.');
        console.log('Type "help" for commands, "exit" to quit.\n');

        this.rl.prompt();

        this.rl.on('line', async (input) => {
            const trimmedInput = input.trim();

            if (this.handleCommands(trimmedInput)) {
                this.rl.prompt();
                return;
            }

            if (trimmedInput) {
                await this.processUserInput(trimmedInput);
            }

            this.rl.prompt();
        });

        this.rl.on('close', () => {
            console.log('\n👋 Goodbye! Thanks for thinking together.');
            process.exit(0);
        });
    }

    handleCommands(input) {
        switch (input.toLowerCase()) {
            case 'exit':
            case 'quit':
                this.rl.close();
                return true;

            case 'help':
                this.showHelp();
                return true;

            case 'toggle':
                this.options.showInternalDialogue = !this.options.showInternalDialogue;
                console.log(`Internal dialogue display: ${this.options.showInternalDialogue ? 'ON' : 'OFF'}`);
                return true;

            case 'history':
                this.showHistory();
                return true;

            case 'clear':
                this.conversationHistory = [];
                console.log('Conversation history cleared.');
                return true;

            default:
                return false;
        }
    }

    showHelp() {
        console.log(`
Commands:
  help     - Show this help message
  toggle   - Toggle internal dialogue display (currently ${this.options.showInternalDialogue ? 'ON' : 'OFF'})
  history  - Show conversation history
  clear    - Clear conversation history
  exit     - Exit the chat
        `);
    }

    showHistory() {
        if (this.conversationHistory.length === 0) {
            console.log('No conversation history yet.');
            return;
        }

        console.log('\n📚 Conversation History:');
        this.conversationHistory.forEach((exchange, i) => {
            console.log(`\n${i + 1}. You: ${exchange.userInput}`);
            console.log(`   AI: ${exchange.response}`);
        });
        console.log();
    }

    async processUserInput(userInput) {
        try {
            console.log('\n🤔 Thinking...');

            const [status, output] = await runThinkingCompanion(userInput, {
                quiet: this.options.quiet
            });

            const response = output.final_response?.content || 'No response generated';
            const mode = output.behavioral_instructions?.mode || 'Unknown';

            // Store in conversation history
            this.conversationHistory.push({
                userInput,
                response,
                timestamp: new Date().toISOString()
            });

            // Render
            if (!this.options.showInternalDialogue) {
                console.log('\n🤖 AI Response:');
                console.log(response);
                console.log(chalk.dim(`   Mode: ${mode}`));
            } else {
                this.showInternalDialogue(output);
                console.log(chalk.green('\n✨ Final Response:'));
                console.log(response);
                console.log(chalk.dim(`   Mode: ${mode}`));
            }

            console.log(); // Extra line for spacing

        } catch (error) {
            console.error('\n❌ Error:', error.message);
            console.log(); // Extra line for spacing
        }
    }

    showInternalDialogue(output) {
        console.log('\n🧵 Internal Dialogue:');

        const messages = output.thread?.filter(msg =>
            msg.role === 'outer' || msg.role === 'inner'
        ) || [];

        const turnCount = output.context?.turn_count ?? 'N/A';

        if (messages.length === 0) {
            console.log('  (No internal dialogue recorded)');
            return;
        }

        messages.forEach((msg, index) => {
            const icon = msg.role === 'outer' ? '🗣️' : '💭';
            const label = msg.role === 'outer' ? 'Outer Voice' : 'Inner Voice';
            console.log(`\n  ${icon} ${label}:`);
            console.log(this.formatBlock(msg.content));
        });

        console.log(chalk.dim(`\n   🔄 Turn: ${turnCount}`));
    }

    formatBlock(text) {
        const maxWidth = 76;
        const indent = '     ';
        const words = text.split(/\s+/);
        const lines = [];
        let currentLine = '';

        for (const word of words) {
            if ((currentLine + ' ' + word).trim().length > maxWidth) {
                lines.push(indent + currentLine.trim());
                currentLine = word;
            } else {
                currentLine += ' ' + word;
            }
        }

        if (currentLine) {
            lines.push(indent + currentLine.trim());
        }

        return lines.join('\n');
    }
}

// Start the chat if running directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const chat = new ThinkingCompanionChat({
        showInternalDialogue: true,
        quiet: true
    });

    chat.start().catch(error => {
        console.error('Failed to start chat:', error.message);
        process.exit(1);
    });
}
