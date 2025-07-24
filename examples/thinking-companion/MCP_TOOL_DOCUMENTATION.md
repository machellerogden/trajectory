# Thinking Companion MCP Tool Documentation

## Overview

The Thinking Companion is an intelligent MCP (Model Context Protocol) tool that provides sophisticated conversation analysis and intervention recommendations for Claude Code. It implements Sage-level epistemic intelligence with auto-triggering intervention capabilities.

## Tool Interface

### Tool Name: `contemplate`

**Description**: Analyze conversation patterns and provide intelligent intervention recommendations for thinking companions

### Parameters

#### Required
- **message** (string): The current user query or message to analyze

#### Optional (in `options` object)
- **conversationHistory** (array): Array of conversation messages for pattern analysis
  - Each message must have:
    - **role** (enum: 'user' | 'assistant'): The role of the message sender
    - **content** (string): The message content
  - **For longer conversations (>8 turns)**: Consider providing a structured summary instead of full history to reduce token usage while preserving pattern detection capability
- **maxTokens** (number): Token limit for LLM responses
- **temperature** (number): Temperature override for LLM calls  
- **quiet** (boolean): Suppress internal logging output

### Usage Example

```javascript
// Claude Code invokes the tool like this:
await mcpTool.contemplate("I keep going back and forth on this decision", {
  conversationHistory: [
    { role: "user", content: "Should I take this new job offer?" },
    { role: "assistant", content: "What factors are you considering?" },
    { role: "user", content: "I'm not sure. Maybe the salary is better..." }
  ]
});
```

## Intervention Types

The tool automatically determines the most appropriate intervention based on detected patterns:

### 1. Strike-Claim Intervention
**Trigger**: Stalling risk > 60% + recursive patterns detected
**Purpose**: Interrupt recursive analysis and decision avoidance
**Delivery**: Direct, unqualified statements

Example interventions:
- "You already know what you want. You're stalling."
- "This isn't complexity. It's hesitation dressed as rigor."
- "You're using complexity to delay a decision that's simpler than you're making it."

### 2. Validation Support
**Trigger**: Emotional witness-call signals detected
**Purpose**: Acknowledge emotional reality before proceeding with analysis
**Delivery**: Supportive, empathetic

Example intervention:
- "Acknowledge the emotional reality before proceeding with analysis"

### 3. Ease Analytical Pressure
**Trigger**: Very high stalling risk (>80%) + cognitive overload
**Purpose**: Reduce analytical pressure when over-analysis is counterproductive
**Delivery**: Gentle, permission-giving

Example intervention:
- "Step back from analysis and trust your intuition for now"

### 4. Shadow Detection
**Trigger**: Repetitive thematic patterns suggesting narrow framing
**Purpose**: Surface excluded perspectives and missing factors
**Delivery**: Exploratory, expansive

Example intervention:
- "Identify what perspectives or factors are being excluded from consideration"

### 5. Assumption Tracing
**Trigger**: Clear assumptions present with good conversation flow
**Purpose**: Surface and examine key assumptions being made
**Delivery**: Diagnostic, precise

Example intervention:
- "Surface and examine the key assumptions being made"

### 6. Cognitive Load Management
**Trigger**: High cognitive load signals detected
**Purpose**: Break down complexity into manageable components
**Delivery**: Structured, simplifying

Example intervention:
- "Break down the complexity into smaller, manageable components"

### 7. Exploratory Engagement (Default)
**Trigger**: No strong intervention patterns detected
**Purpose**: Maintain curious, open-ended exploration
**Delivery**: Curious, open

Example intervention:
- "Engage with curiosity and open-ended questions to deepen the inquiry"

## Output Format

The tool returns formatted text with the following sections:

### Primary Recommendation
- Icon-prefixed intervention type (⚡ Strike-Claim, 🤝 Validation, 🛑 Ease Pressure, etc.)
- Direct intervention text/quote
- Reasoning and confidence percentage

### Conversation Analysis
- **Stalling Risk**: 0-100% with warning indicator for >60%
- **Progression Score**: 0-100% indicating conversation advancement
- **Thematic Loops**: Detected repetitive patterns (analysis-loops, indecision, etc.)

### Cognitive Patterns
- List of detected cognitive patterns and their implications
- Examples: "High stalling risk - conversation may be cycling without progression"

### Additional Approaches
- Secondary recommendations (lower priority/confidence)
- Up to 2 additional intervention options

### Metadata
- Analysis confidence percentage
- Conversation length (number of turns)

## Example Output

```
⚡ **Strike-Claim Intervention:**
"You're using complexity to delay a decision that's simpler than you're making it."
*Triggered by: decision-avoidance, strike-claim-ready | Confidence: 80%*

📊 **Conversation Analysis:**
• **Stalling Risk**: 80% ⚠️
• **Progression Score**: 80%
• **Thematic Loops**: analysis-loops, indecision

🧠 **Cognitive Patterns:**
• High stalling risk - conversation may be cycling without progression
• Recursive patterns detected - similar themes repeating across turns

🔄 **Additional Approaches:**
2. **shadow_detection**: Identify what perspectives or factors are being excluded from consideration

*Analysis confidence: 100% | Conversation length: 8 turns*
```

## Configuration

The tool is configured in `mcp.json`:

```json
{
  "mcpServers": {
    "ThinkingCompanion": {
      "command": "node",
      "args": [
        "/path/to/trajectory/examples/thinking-companion/mcp-server.js"
      ]
    }
  }
}
```

## Conversation Summarization for Pattern Detection

For longer conversations (>8 turns), you can provide a structured summary instead of full message history to reduce token usage while preserving pattern detection capability.

### **Required Elements to Preserve:**

1. **Turn-by-Turn Flow**: Maintain the sequence and role indicators
   ```
   Turn 1 (user): Asked about job decision
   Turn 2 (assistant): Requested factors being considered  
   Turn 3 (user): Listed salary vs culture concerns with hedging
   ```

2. **Repeated Themes/Concepts**: Track recurring topics across turns
   ```
   Recurring themes: salary considerations (turns 1,3,5), culture concerns (turns 3,4,6), analysis requests (turns 5,7)
   ```

3. **Hedging Language Patterns**: Note frequency and intensity
   ```
   Hedging indicators: High frequency of "maybe", "perhaps", "might" (8 instances across 4 turns)
   ```

4. **Analysis vs. Action Orientation**: Note progression patterns
   ```
   Turn 3: Analysis-focused ("need to consider more factors")
   Turn 5: Analysis-expanding ("should look at additional aspects")  
   Turn 7: Analysis-cycling ("maybe analyze this differently")
   ```

5. **Decision Avoidance Indicators**: Track avoidance patterns
   ```
   Avoidance patterns: Requests for more analysis when sufficient info exists (turns 5,7), complexity expansion without direction (turn 6)
   ```

### **Example Structured Summary:**
```json
[
  {"role": "summary", "content": "Turn 1-3: User asks about job decision, mentions salary vs culture tradeoff with moderate hedging. Turn 4-6: Continues analysis without progression, high hedging ('maybe', 'perhaps' x6). Turn 7-8: Requests more factors to consider despite sufficient information. Themes: salary (recurring), culture (recurring), analysis-expansion. Avoidance: 3 requests for additional analysis."}
]
```

This approach maintains analytical fidelity while significantly reducing token usage for longer conversations.

## Integration Notes

1. **Conversation Memory**: The tool requires conversation history to detect stalling patterns and recursive analysis. Without history, it defaults to exploratory engagement.

2. **Auto-Detection**: The tool automatically determines intervention types - Claude Code doesn't need to specify what kind of analysis to perform.

3. **Confidence Scoring**: All recommendations include confidence scores to help Claude Code determine how strongly to apply the intervention.

4. **Priority Ordering**: Recommendations are sorted by priority (high/medium/low) and confidence, with the most important intervention listed first.

5. **Failsafe Logic**: The tool includes failsafes to recommend easing analytical pressure when over-analysis becomes counterproductive.

## Technical Architecture

- **Signal Detection**: 6-class parallel signal detection (logic, stance, rhythm, affect, framing, meta)
- **Pattern Analysis**: Conversation-wide pattern recognition for stalling, progression, and thematic loops
- **Intelligent Recommendations**: Priority-based intervention selection with confidence scoring
- **State Machine Foundation**: Built on Trajectory's deterministic state machine orchestration

This tool represents a sophisticated implementation of Sage-level epistemic intelligence using state machine orchestration rather than instruction-based approaches.