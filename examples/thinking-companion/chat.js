import { createInterface } from 'node:readline';
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
            
            // Store in conversation history
            this.conversationHistory.push({
                userInput,
                response,
                timestamp: new Date().toISOString()
            });
            
            console.log('\n🤖 AI Response:');
            console.log(response);
            
            // Show internal dialogue if enabled
            if (this.options.showInternalDialogue && output.thread) {
                this.showInternalDialogue(output);
            }
            
            // Show stance analysis
            if (output.stance_signal) {
                console.log(`\n📊 Detected stance: ${output.stance_signal.content}`);
            }
            
            console.log(); // Extra line for spacing
            
        } catch (error) {
            console.error('\n❌ Error:', error.message);
            console.log(); // Extra line for spacing
        }
    }
    
    showInternalDialogue(output) {
        console.log('\n🧵 Internal Dialogue:');
        
        const relevantMessages = output.thread.filter(msg => 
            msg.role === 'outer' || msg.role === 'inner'
        );
        
        if (relevantMessages.length === 0) {
            console.log('  (No internal dialogue recorded)');
            return;
        }
        
        relevantMessages.forEach((msg, i) => {
            const icon = msg.role === 'outer' ? '🗣️' : '💭';
            const label = msg.role === 'outer' ? 'Outer Voice' : 'Inner Voice';
            console.log(`  ${icon} ${label}: ${msg.content}`);
        });
        
        console.log(`  🔄 Turns: ${output.context?.turn_count || 0}`);
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