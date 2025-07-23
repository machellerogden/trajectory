# Thinking Companion

A proof-of-concept implementation of a thinking companion that uses formal state machine orchestration around LLM-based inner and outer voice dialogue.

## Overview

This system demonstrates how Trajectory's state machine framework can orchestrate complex multi-agent LLM workflows. The thinking companion uses a dual-voice architecture:

- **Outer Voice**: Proposes responses and reasoning
- **Inner Voice**: Provides critique, questions, and alternative perspectives  
- **Signal Analysis**: Analyzes user input to determine appropriate stance

The state machine ensures reliable execution with proper error handling, while the LLM agents provide intelligent, nuanced responses through internal deliberation.

## Architecture

### Core Components

- `thinking-companion.json` - State machine definition with embedded prompts
- `providers.js` - OpenAI API abstraction with provider pattern
- `tasks.js` - Task function implementations 
- `thinking-companion.js` - Main executor following Trajectory examples pattern
- `chat.js` - Interactive REPL interface

### State Flow

1. **ReceiveUserInput** - Append user message to conversation thread
2. **StanceDistiller** - Analyze input for appropriate response stance (supportive/critical/exploratory/informational)
3. **OuterVoiceProposal** - Generate initial response proposal
4. **InnerVoiceResponse** - Critique and provide feedback
5. **CheckConvergence** - Check if voices agree or turn limit reached
6. **ReviseWithInnerFeedback** - Outer voice revises based on inner feedback (loops back to step 4)
7. **GenerateFinalResponse** - Synthesize deliberation into final user response

## Prerequisites

- Node.js >=18.0.0
- OpenAI API key in environment variable `OPENAI_API_KEY`

## Usage

### Quick Test

Run a single query:

```bash
# From the thinking-companion directory
node thinking-companion.js "What's the best way to learn programming?"
```

### Interactive Chat

Start an ongoing conversation:

```bash
node chat.js
```

Chat commands:
- `help` - Show available commands
- `toggle` - Toggle internal dialogue display
- `history` - Show conversation history  
- `clear` - Clear conversation history
- `exit` - Exit the chat

### Programmatic Usage

```javascript
import { runThinkingCompanion } from './thinking-companion.js';

const [status, output] = await runThinkingCompanion(
    "How should I approach learning machine learning?",
    { 
        quiet: false, // Show execution steps
        initialContext: { max_turns: 5 } // Allow more deliberation turns
    }
);

console.log('Final Response:', output.final_response.content);
console.log('Internal Dialogue:', output.thread);
```

## Configuration

### Environment Variables

- `OPENAI_API_KEY` - Required OpenAI API key

### State Machine Parameters

The system uses GPT-4o with these default settings:
- **Stance Distiller**: Temperature 0, max 5 tokens
- **Outer Voice**: Temperature 0.4  
- **Inner Voice**: Temperature 0.5
- **Final Response**: Temperature 0.3

### Customization

To modify prompts, edit the embedded prompt strings in `thinking-companion.json`. To add new signal distillers or change the conversation flow, modify the state machine structure.

## Examples

### Basic Query
```
User: "Should I use React or Vue for my next project?"

Stance: exploratory
Outer Voice: "Let me explore the key differences..."
Inner Voice: "Consider also asking about the user's specific needs..."
Final Response: [Synthesized comparison with follow-up questions]
```

### Complex Request  
```
User: "I'm struggling with imposter syndrome as a new developer"

Stance: supportive  
Outer Voice: "This is very common and here's why..."
Inner Voice: "Make sure to validate their feelings first..."
Final Response: [Empathetic response with practical advice]
```

## Key Features

- **Transparent Reasoning**: See the internal deliberation process
- **Adaptive Stance**: Response style adapts to input analysis
- **Convergence Control**: Voices iterate until agreement or turn limit
- **Error Resilience**: Graceful handling of API failures
- **Conversation History**: Maintains context across interactions

## Limitations

- Currently supports only OpenAI GPT-4o
- Single stance signal (extensible to multiple signals)
- Basic convergence detection (exact string matching for "agree")
- No persistent conversation memory across sessions

## Future Enhancements

- Multiple signal distillers (logic, affect, rhythm, framing)
- Support for additional LLM providers  
- Persistent conversation memory
- Quality assessment and reflection generation
- Sub-orchestration for complex queries
- MCP tool integration for Claude Code

## Development

### Testing

```bash
# Run a test with debug output
OPENAI_API_KEY=your_key node thinking-companion.js "test query" 

# Test the chat interface
OPENAI_API_KEY=your_key node chat.js
```

### Adding New Signals

1. Add new distiller state to `thinking-companion.json`
2. Update prompts to incorporate new signal
3. Modify `tasks.js` if new task functions needed
4. Test with various input types

This implementation demonstrates the potential for formal orchestration of AI reasoning processes while maintaining the benefits of non-deterministic LLM creativity and insight.