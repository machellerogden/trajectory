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

A sophisticated thinking companion that moves beyond the original "Multiple Perspectives" vision to implement a true **Sage-level epistemic companion** with state machine orchestration. After three major iterations, we've achieved:

**Core Architecture (Iterations 1-3 Complete):**
- **Outer/Inner voice dialogue system** with Sage's diagnostic precision and shadow detection
- **6-class parallel signal detection** (logic, stance, rhythm, affect, framing, meta) 
- **18 distinct signal types** with intelligent behavioral adaptation mappings
- **Dynamic turn management** that adapts conversation length to cognitive needs
- **Conversation pattern analysis** with stalling detection and strike-claim readiness
- **Sophisticated rhythmic adaptation** that respects cognitive flow vs. arbitrary limits

**Technical Achievements:**
- **Epistemic Language Precision**: Transformed from cooperative helper to diagnostic companion using Sage's language patterns
- **Signal-to-Behavior Mapping**: 18 behavioral instructions that dynamically adapt diagnostic approach based on detected signals
- **Rhythmic Intelligence**: Pattern recognition system that detects thematic loops, progression tracking, and decision avoidance
- **Strike-Claim Architecture**: Auto-triggering intervention system for recursive analysis and low-pressure indecision
- **Orchestrated LLM Intelligence**: Conversation analysis via state machine orchestration instead of imperative heuristics
- **Budget-Conscious Scaling**: Single comprehensive analysis call vs. 4x token duplication, 75% token reduction
- **Dynamic Resource Management**: Token limits and response complexity adapt to cognitive load signals

**Enhanced Signal Detection Classes:**
```javascript
SIGNAL_CLASSES = {
  logic: ["assumption", "implication", "missing-data"],
  stance: ["overreach", "uncertainty", "speculation"], 
  rhythm: ["stalling", "pacing", "flow", "cognitive-load"],
  affect: ["valence", "relational-mode", "witness-call"],
  framing: ["frame", "tension", "container"],
  meta: ["mode-drift", "alignment-gap", "trigger-match"]
}
```

**Behavioral Intelligence:**
- **Outer Voice**: Diagnostic companion with signal-specific assumption tracing and implication analysis
- **Inner Voice**: Shadow detector surfacing exclusions and missing perspectives  
- **Final Response**: Space creator with epistemic humility and rhythmic sensitivity
- **Pattern Recognition**: Detects repetitive themes, progression vs. cycling, and intervention readiness

### Key Architectural Insights

**State Machine Orchestration Advantages:**
- **Deterministic control flow** around non-deterministic LLM operations
- **Parallel signal processing** with guaranteed aggregation
- **Rich instrumentation** for debugging and behavioral analysis
- **Composable workflows** that can be extended and modified
- **Declarative analysis prompts** visible in machine definition vs. buried in JavaScript
- **Budget-conscious LLM orchestration** with consolidated analysis calls

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

## Implementation Status: 7-Iteration Roadmap

### ✅ Completed Iterations (5/7)

**Iteration 1: Epistemic Language Precision** ✅ COMPLETE
- Transformed all prompts from generic cooperation to Sage's diagnostic precision
- Implemented "diagnostic companion" and "shadow detector" language patterns
- Added epistemic humility and assumption-exposing behavioral positioning

**Iteration 2: Signal-to-Behavior Mapping** ✅ COMPLETE  
- Created comprehensive behavioral interpretation system for all 18 signals
- Dynamic token management based on rhythm signals (cognitive-load, stalling)
- Signal-specific instructions for outer voice, inner voice, and final response

**Iteration 3: Rhythmic Adaptation** ✅ COMPLETE
- Dynamic turn management: stalling reduces to 2 turns, cognitive-load extends to 5 turns
- Conversation pattern analysis: thematic loops, progression tracking, decision avoidance detection
- Strike-claim readiness system: identifies "recursive analysis" and "low-pressure indecision"
- Auto-triggering intervention architecture with contextual direct claims

**Iteration 4: Strike-Claim Delivery System** ✅ COMPLETE
- **Completed**: Full strike-claim delivery system with intelligent auto-detection
- **Achievements**: MCP tool integration, conversation pattern analysis, intervention recommendations
- **Validated**: Strike-claim triggers at 0.8 stalling risk, provides direct unqualified interventions

**Iteration 5: LLM-Powered Analysis Architecture** ✅ COMPLETE
- **Completed**: Replaced crude keyword matching with sophisticated LLM conversation analysis
- **Achievements**: Consolidated 4 parallel calls to 1 comprehensive analysis, 75% token reduction
- **Technical**: Declarative prompts in state machine vs. buried JavaScript heuristics
- **Validated**: Maintains analytical depth while being budget-conscious at scale

### 📋 Remaining Iterations (2/7)

**Iteration 6: Shadow Detection Capabilities** ⚠️ PARTIALLY IMPLEMENTED
- **Completed**: Inner voice shadow detection ("What's excluded from this frame?")
- **Missing**: Formal premise suspension mode, enhanced shadow signal classes
- **Next**: Add premise suspension state and shadow-specific signal detection

**Iteration 7: Mode System Foundation** ❌ NOT STARTED
- **Scope**: Implement Sage's 6 formal modes (Context Loading, Clarifying, Analytical, etc.)
- **Architecture**: Mode tracking, mode-specific state transitions, mode persistence
- **Impact**: Foundation for full Sage mode system with formal cognitive state management

## Current System Capabilities

The thinking companion now demonstrates **Sage-level epistemic intelligence** with:

**✅ Working Systems:**
- Diagnostic assumption tracing with epistemic humility
- Shadow detection surfacing exclusions and missing perspectives
- Rhythmic adaptation responding to cognitive flow patterns
- Strike-claim delivery system with auto-triggering intervention at 0.8 stalling risk
- LLM-powered conversation analysis with 75% token reduction vs. parallel approach
- MCP tool integration for Claude Code with sophisticated pattern recommendations
- Dynamic behavioral adaptation based on 18 signal types across 6 classes

**⚠️ Needs Completion:**
- Enhanced shadow detection beyond current exclusion focus  
- Premise suspension as formal behavioral modifier

**❌ Not Yet Implemented:**
- Formal mode system (Context Loading, Clarifying, Analytical, Exploratory, Sequential Reasoning, Relational Presence)
- Mode persistence and transitions
- Calibration trigger system

## Latest Progress: Full Sage System Architecture (July 2025)

### Major Breakthrough: Claude Code Command Integration

**Architecture Evolution**: Moved beyond MCP-only approach to a **two-layer system architecture**:

1. **Layer 1: Claude Code Commands** (Setup + Calibration)
   - `/sage` command for initialization and user onboarding
   - Calibration triggers: `/re-orient`, `/introspect`, `/shadows`, `/breathe`, `/echo`
   - Establishes conversation context and educates users on system capabilities

2. **Layer 2: MCP Tool** (Execution Engine)
   - `contemplate` tool handles sophisticated state machine orchestration
   - Mode system execution, auto-triggering, and conversation analysis
   - Formal state management with guaranteed behavioral consistency

### Technical Improvements

**✅ Enhanced Error Handling (Completed)**
- Comprehensive retry logic for all LLM call states
- Fallback states with graceful degradation
- Eliminated silent failures that previously caused premature termination

**✅ Final Turn Awareness (Completed)**
- `InnerVoiceFinalResponse` state with final-turn-aware prompting
- `RouteToInnerVoice` choice state for intelligent turn-based routing
- Dynamic convergence management preventing abrupt terminations

**✅ Claude Code Integration (Completed)**
- 6 command files organized in `~/.claude/commands/sage/` directory
- Clean separation of user interface from execution complexity
- Rich onboarding experience with mode explanations and usage patterns

### Current System Capabilities

**✅ Foundation Complete (40% of Full Sage)**

1. **Core Strike-Claim Architecture** - Auto-triggering intervention at 0.6+ stalling risk
2. **18-Signal Detection System** - 6 classes with behavioral adaptation mappings
3. **Outer/Inner Voice Dialogue** - Diagnostic companion + shadow detector with epistemic precision
4. **LLM-Powered Analysis** - Conversation pattern detection with 75% token efficiency vs. parallel approach
5. **Turn Management** - Dynamic max_turns with final turn awareness and graceful convergence
6. **Error Resilience** - Comprehensive fault handling preventing system failures
7. **MCP Integration** - Working tool providing Claude Code with intervention recommendations
8. **Command Interface** - Full calibration trigger system via Claude Code commands

### Remaining Implementation (60% of Full Sage)

**❌ Mode System (0% Complete)**
- 6 formal modes as state machine sub-workflows
- Mode persistence, entry/exit acknowledgments, conflict resolution

**⚠️ Stance Modifiers (20% Complete)**  
- Shadow Noticing implemented in inner voice
- Missing: Premise Suspension as formal behavioral modifier
- Missing: One-at-a-time enforcement and overlay system

**✅ Calibration Triggers (100% Complete via Commands)**
- All 5 triggers implemented as Claude Code commands
- Clean integration with MCP tool execution

**⚠️ Advanced Behavioral Intelligence (60% Complete)**
- Epistemic humility and diagnostic stance implemented
- Missing: Mode-specific behavioral variations
- Missing: Somatic awareness and advanced rhythm adaptation

## Strategic Assessment: Foundation → Implementation Phase

**Status**: Successfully completed **foundational architecture** and proven the approach works. Ready to begin **systematic implementation** of remaining Sage components.

**Key Validation**: The two-layer architecture solves the critical "user education and calibration" problem while maintaining sophisticated state machine execution. Users get familiar command interfaces while the system delivers reliable behavioral consistency.

**Next Phase Priority**: Implement the 6-mode system as formal state machine workflows, starting with Context Loading and Clarifying modes as foundation.

## Architectural Insights

The thinking companion evolution has revealed that **instruction-based AI companions have fundamental limitations**:
- State drift across conversation turns
- Unreliable auto-triggering detection  
- Memory fragility and debugging opacity
- Behavioral inconsistency under identical conditions

**State machine orchestration solves these systematically** through:
- Formal state management with guaranteed persistence
- Algorithmic pattern detection and intervention triggering
- Declarative prompt definition with full execution traceability
- Deterministic behavioral consistency and error recovery

This validates the core vision: **formal orchestration around non-deterministic LLM processes** creates reliable, auditable, and composable agent workflows that can implement sophisticated thinking companion behaviors impossible with purely instructional approaches.