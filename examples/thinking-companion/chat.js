import { createInterface } from 'node:readline';
import chalk from 'chalk';
import { runThinkingCompanion } from './thinking-companion.js';

class ThinkingCompanionChat {
    constructor(options = {}) {
        this.currentExecution = null; // Track current execution
        this.options = {
            showInternalDialogue: options.showInternalDialogue ?? false,
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

        process.on('SIGINT', async () => {
            if (this.currentExecution) {
                console.log(chalk.red('\n🛑 Interrupting... cancelling current thinking process.'));
                // If using AbortController or custom cancel hook, trigger it here
                this.currentExecution.cancel?.(); // optional
                this.currentExecution = null;
                this.rl.prompt(); // resume clean prompt
            } else {
                console.log(chalk.gray('\n👋 Ctrl+C again to exit.'));
                process.exit(0);
            }
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
        this.rl.pause();
        try {
            console.log('\n🤔 Thinking...');

            const newThread = [...this.conversationHistory.flatMap(m => [{ role: 'user', content: m.userInput }, { role: 'ai', content: m.response }]), { role: 'user', content: userInput }];

            this.currentExecution = runThinkingCompanion(newThread, {
                quiet: false,
                log: this.logHook.bind(this),
            });

            const [status, output] = await this.currentExecution;
            this.currentExecution = null; // Clear current execution

            const response = output.final_response?.content || 'No response generated';
            const mode = output.behavioral_instructions?.mode || 'Unknown';

            // Store in conversation history
            this.conversationHistory.push({
                userInput,
                response,
                timestamp: new Date().toISOString()
            });

            // Render
            console.log('\n🤖 AI Response:');
            console.log(response);
            console.log(chalk.dim(`   Mode: ${mode}`));

        } catch (error) {
            console.error('\n❌ Error:', error.message);
        } finally {
            console.log(); // Extra line for spacing
            this.rl.resume();
            this.rl.prompt();
        }
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

    logHook(context, event, label, ...args) {
        if (!this.options.showInternalDialogue) return;
        const { stateKey } = context;

        if (event === 'StateSucceed' && label === 'HandlerSucceeded') {
            const output = args[0];
            if (!output || typeof output !== 'object') return;

            switch (stateKey) {
                case 'AggregateSignals':
                    console.log('\n🧠 Signal Analysis:\n' + '─'.repeat(32));
                    for (const [className, detected] of Object.entries(output.signals || {})) {
                        if (detected.length > 0) {
                            console.log(`  ${className}: ${detected.join(', ')}`);
                        }
                    }
                    break;

                case 'OuterVoiceProposal':
                    console.log('\n🗣️  Outer Voice Proposes:\n' + '─'.repeat(32));
                    console.log(this.formatBlock(output.content));
                    break;

                case 'InnerVoiceResponse':
                case 'InnerVoiceFinalResponse':
                    if (output.content.trim().toLowerCase() !== 'agree') {
                        console.log('\n💭 Inner Voice Responds:\n' + '─'.repeat(32));
                        console.log(this.formatBlock(output.content));
                    } else {
                        console.log(chalk.dim('\n✅ Voices converged.'));
                    }
                    break;

                case 'ReviseWithInnerFeedback':
                    console.log('\n🔄 Outer Voice Revises:\n' + '─'.repeat(32));
                    console.log(this.formatBlock(output.content));
                    break;

                default:
                    break; // silent for other states
            }
        }
    }
}

// Start the chat if running directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const chat = new ThinkingCompanionChat({
        showInternalDialogue: true
    });

    chat.start().catch(error => {
        console.error('Failed to start chat:', error.message);
        process.exit(1);
    });
}
