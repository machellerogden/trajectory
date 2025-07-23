# MCP Agent Orchestration Vision

**Project Goal**: Build a Node.js MCP (Model Context Protocol) tool that demonstrates Trajectory's potential for orchestrating complex multi-agent LLM workflows.

## Core Concept

Use **Trajectory's state machine architecture to add formal orchestration control around non-deterministic LLM processes**, creating reliable, auditable, and composable agent workflows that Claude Code can invoke as tools.

## The Vision

### Formal Orchestration + LLM Non-Determinism
- **State machines provide**: Guaranteed delivery, error handling, retry logic, execution tracing
- **LLM agents provide**: Intelligent processing, varied perspectives, creative synthesis
- **Combined result**: Reliable multi-agent workflows with full auditability

### Key Architecture Insight
Leverage Trajectory's `with-effects` system where:
- **Pure orchestration logic** in state machine definitions
- **Pluggable LLM backends** as effect handlers
- **Deterministic control flow** around non-deterministic AI operations

## Prototype Example: "Multiple Perspectives Analysis"

**Workflow Structure:**
```
Start Input → Parallel Dispatch [
  Agent 1: Security perspective analysis
  Agent 2: Business implications review  
  Agent 3: User experience considerations
  Agent 4: Edge case identification
] → Synthesis Agent → Distilled Output
```

**Value Proposition:**
- Claude Code invokes one MCP tool
- Gets back synthesized insights from 4+ specialized perspectives
- All with guaranteed completion and full execution trace

## Additional Compelling Use Cases

### 1. Adversarial Refinement
```
Proposer → Critic → Refiner → Quality Gate → [Loop or Output]
```

### 2. Research Pipeline
```
Gather Sources → Analyze Each → Cross-Reference → Synthesize → Validate → Report
```

### 3. Quality Assurance Workflow
```
Generate → Review Security → Review Performance → Review UX → Approve/Reject
```

### 4. Iterative Enhancement
```
Initial Draft → [Critique → Improve]* → Quality Threshold Check → Final Output
```

## Technical Foundation

### Trajectory Strengths for This Use Case
- **Parallel execution**: Map/Parallel states for concurrent agent dispatch
- **Error handling**: Retry failed agents, handle timeouts gracefully
- **Logging system**: Full execution traces for debugging/auditing
- **Composability**: Chain workflows, reuse sub-workflows
- **Resource control**: Concurrency limits, execution constraints

### MCP Integration Points
- **Tool Discovery**: Expose Trajectory workflows as callable MCP tools
- **JSON-RPC Communication**: Standard MCP protocol over stdio
- **Configuration**: Allow Claude Code to parameterize workflows
- **Status Updates**: Stream execution progress back to Claude Code

## Implementation Strategy

### Phase 1: Proof of Concept
1. Single "Multiple Perspectives" workflow
2. Hardcoded 4-agent parallel dispatch
3. Simple synthesis step
4. Basic MCP tool wrapper

### Phase 2: Generalization
1. Configurable agent instructions
2. Dynamic workflow composition
3. Multiple workflow templates
4. Advanced error handling

### Phase 3: Ecosystem
1. Workflow marketplace/library
2. Agent specialization system
3. Performance optimization
4. Integration with other tools

## Key Questions to Explore

1. **Agent Backend**: How to integrate with various LLM APIs (OpenAI, Anthropic, etc.)?
2. **Workflow Definition**: JSON configs vs. JavaScript definitions?
3. **State Management**: How to handle conversation context across agents?
4. **Resource Management**: Rate limiting, cost control, timeout handling?
5. **Composability**: How to chain these MCP tools together?

## Success Metrics

- **Reliability**: Workflows complete successfully despite individual agent failures
- **Auditability**: Full execution traces for debugging and compliance
- **Performance**: Efficient parallel execution with proper resource control
- **Usability**: Easy to define new workflows and agent configurations
- **Integration**: Seamless Claude Code experience via MCP protocol

---

## Current Progress: Thinking Companion PoC (January 2025)

### What We've Built

A sophisticated thinking companion that moves beyond the original "Multiple Perspectives" vision to implement a true **multi-modal AI agent system** with:

**Core Architecture:**
- **Outer/Inner voice dialogue system** with iterative refinement and convergence detection
- **6-class parallel signal detection** (logic, stance, rhythm, affect, framing, meta) 
- **18 distinct signal types** across classes for nuanced behavioral adaptation
- **Budget-aware execution** with configurable token limits
- **Depth-aware logging** that cleanly separates main machine from parallel branch events

**Technical Achievements:**
- Solved Trajectory parallel state execution and logging challenges
- Implemented robust JSON parsing with error handling for LLM responses
- Created sophisticated signal aggregation and validation system
- Built custom reporter with rich formatting and convergence tracking
- Demonstrated reliable multi-turn dialogue with persistent state

**Signal Detection Classes:**
```javascript
SIGNAL_CLASSES = {
  logic: ["assumption", "implication", "missing-data"],
  stance: ["certainty", "uncertainty", "defensiveness", "openness"], 
  rhythm: ["urgent", "patient", "stalling", "building"],
  affect: ["positive", "negative-calm", "negative-tense", "witness-call", "detachment"],
  framing: ["problem-solving", "exploration", "evaluation", "narration"],
  meta: ["self-reference", "process-awareness", "confusion"]
}
```

### Key Architectural Insights

**State Machine Orchestration Advantages:**
- **Deterministic control flow** around non-deterministic LLM operations
- **Parallel signal processing** with guaranteed aggregation
- **Rich instrumentation** for debugging and behavioral analysis
- **Composable workflows** that can be extended and modified

**Trajectory-Specific Learnings:**
- Parallel branches execute as complete sub-machines with full event lifecycle
- Context depth (`context.depth`) differentiates main machine from branches
- Effects system enables clean separation of pure logic from side effects
- Custom loggers can provide domain-specific visualization of complex workflows

## Vision Evolution: From MCP Tool to Sage Implementation

### The Sage Connection

The thinking companion PoC revealed alignment with a more ambitious goal: implementing a sophisticated **epistemic companion** based on existing Sage system instructions.

**Current Sage System (Instruction-Based) Features:**
- **6 cognitive modes**: Context Loading, Clarifying, Analytical, Exploratory, Sequential Reasoning, Relational Presence
- **3 stance modifiers**: Shadow Noticing, Premise Suspension, Strike-Claim (auto-triggered)
- **5 calibration triggers**: API-like behavioral resets and introspection commands
- **Auto-triggering intelligence**: Strike-Claim fires on detected "recursive analysis or low-pressure indecision"

**State Management Limitations of Instruction-Based Approach:**
- Mode persistence across conversational turns
- Context buffering for silent states
- Reliable auto-trigger condition detection  
- Consistent calibration trigger behavior
- Memory for conversational pattern recognition

### State Machine Solution Path

**Mode System Implementation:**
Each Sage mode becomes a state machine with proper entry/exit conditions:
- **Context Loading**: Silent Receiving, Buffering, Full Pause states
- **Analytical**: Parallel assumption/risk/structure analysis (extending current signal system)
- **Exploratory**: Idea scattering and reframing workflows
- **Sequential Reasoning**: Step-by-step logic construction with validation

**Auto-Trigger Intelligence:**
- **Pattern detection states** analyzing conversation history for recursion/stalling
- **Strike-Claim delivery** as explicit state transition with controlled tone
- **Cognitive rhythm tracking** through extended signal classes

**Enhanced Signal Detection:**
Expanding current 6-class system to include:
- **Shadow signals**: Detecting absences, exclusions, unspoken elements
- **Premise signals**: Identifying framing assumptions and logical constraints  
- **Cognitive patterns**: Recursion detection, stalling identification, clarity metrics
- **Relational dynamics**: Rapport, resistance, emotional attunement

### Strategic Implications

This evolution transforms the original MCP vision from **"tool for Claude Code"** to **"platform for sophisticated AI agents"**:

1. **Reliability**: State machines provide deterministic behavior vs. instruction drift
2. **Composability**: Modes and behaviors become reusable workflow components  
3. **Observability**: Rich instrumentation enables behavioral debugging and refinement
4. **Scalability**: Complex agent behaviors through systematic state composition
5. **Maintainability**: Clear separation of concerns vs. monolithic prompt engineering

**Next Session Pickup Point**: Ready to map Sage's mode system into state machine workflows, beginning with Shadow Noticing and Strike-Claim auto-triggering logic as extensions of the current signal detection architecture.