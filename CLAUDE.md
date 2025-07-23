# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

Trajectory is a workflow orchestration framework that executes workflows defined in a modified version of Amazon State Language (ASL). It allows defining state machines using JSON configuration files where JavaScript functions are invoked instead of AWS services.

## Commands

### Testing
```bash
npm test          # Run tests with pretty TAP output via tap-diff
npm run test-ugly # Run raw TAP output without formatting
node test.js      # Direct test runner execution

# Run individual test files
node test/integration.test.js    # Integration tests
node test/task.test.js          # Task state tests
node test/map.test.js           # Map state tests
node test/intrinsics.test.js    # Intrinsic functions tests
```

### Running Examples
```bash
# Basic examples
node examples/helloWorld.js      # Basic workflow example
node examples/basic.js           # Simple state machine

# Advanced examples  
node examples/mapIntrinsics.js   # Map state with intrinsic functions
node examples/choiceExample.js   # Choice state branching
node examples/parallelExample.js # Parallel execution
node examples/orderProcessing.js # Complex workflow example
node examples/retryCatch.js      # Error handling and retries
node examples/mapIntrinsicsCustomLogger.js # Custom logging
```

## Architecture

### Core Runtime System
- **lib/runtime.js** - Main state machine execution engine using generator functions and effects
- **lib/constants.js** - Defines STATUS, STATE, EVENT, and ERROR constants used throughout
- **lib/errors.js** - Custom StatesError handling for workflow failures

### State Machine Processing
- **lib/io.js** - JSONPath processing, input/output transformation, and data templates
- **lib/intrinsics.js** - Built-in functions (States.MathAdd, States.Array, etc.)
- **lib/intrinsicResolver.js** - Resolves and executes intrinsic function calls
- **lib/rules.js** - Choice state rule evaluation and branching logic

### Support Systems
- **lib/schema.js** - Joi validation schemas for state machine definitions
- **lib/tokenizer.js** - Expression parsing and tokenization
- **lib/utils.js** - Utility functions including concurrency-limited mapping
- **lib/log.js** - Configurable logging with different levels and custom loggers

### State Machine Types
Supports all Amazon State Language state types:
- **Task** - Execute JavaScript functions
- **Pass** - Transform data without execution
- **Choice** - Conditional branching based on input data
- **Wait** - Pause execution for specified time
- **Parallel** - Execute multiple branches concurrently  
- **Map** - Execute same logic over array items
- **Succeed/Fail** - Terminal states

### Effects System
Uses `with-effects` library - a lightweight algebraic effects implementation using JavaScript generators. The core concept:

- **Generator Functions** yield effects (like `yield fx('ProcessInputPath', input)`)
- **Effect Handlers** are plain objects/functions that define how to handle each effect type
- **withEffects()** drives the generator, intercepting yielded effects and applying handlers
- **Pure Computation** - generators contain pure logic, side effects are handled externally

Key `with-effects` API used by Trajectory:
- `withEffects(generator, handler)` - async effect handling
- `fx(...args)` - effect creation helper (just returns args as array)
- Effects are yielded as arrays: `[effectType, ...args]`

This enables the state machine runtime to yield effects for logging, I/O operations, and state transitions while keeping the core logic pure and testable.

### Testing Framework
- **Framework**: Zora (lightweight, TAP-compatible)
- **Test Runner**: test.js imports and runs all test files
- **Structure**: Unit tests in test/ directory mirror lib/ structure
- **Coverage**: Comprehensive tests for each module plus integration tests

### Key Dependencies
- **joi** - Schema validation for state machine definitions
- **jsonpath-plus** - JSONPath queries for data manipulation and state transitions  
- **with-effects** - Effects system for managing side effects and state
- **chalk** - Terminal styling for log output

## Development Notes

### Project Structure
- **ES Module format** (`"type": "module"` in package.json)
- **Node.js >=18.0.0** required
- **No build step** required - direct Node.js execution
- **No linting or formatting** tools configured

### Key Patterns
- **State Machine Definitions**: JSON files define workflows, JavaScript functions provide task implementations
- **Effects-Based Architecture**: Core logic uses generator functions that yield effects, side effects handled externally
- **JSONPath Queries**: Use `$` for input data access, `$$` for context access in state definitions
- **Intrinsic Functions**: AWS-compatible built-in functions like `States.Array`, `States.MathAdd`
- **Error Handling**: Custom `StatesError` class preserves error context and supports retry/catch logic

### Development Workflow
- **Examples as Documentation**: All examples in `/examples/` are executable and demonstrate different features
- **Paired Files**: Examples have `.js` (executor) and `.json` (state machine definition) files
- **Test Structure**: Unit tests in `/test/` mirror `/lib/` structure
- **Configurable Logging**: All logging goes through configurable logger system with immutable context