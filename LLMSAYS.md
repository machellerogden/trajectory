# Trajectory Documentation

## Overview

Trajectory is a workflow orchestration framework that allows you to execute workflows defined in a slightly modified version of [Amazon State Language](https://docs.aws.amazon.com/step-functions/latest/dg/concepts-amazon-states-language.html) (ASL). If you are already familiar with ASL, you will have no trouble using Trajectory.

## Project Structure

The project consists of several key files and directories:

- **README.md**: Provides an overview of the project.
- **package.json**: Contains metadata about the project, including dependencies, scripts, and author information.
- **index.js**: The main entry point of the application, implementing the core functionality of the state machine execution.
- **lib**: Contains various modules that support the core functionality of the project.
- **examples**: Contains example state machine definitions and corresponding JavaScript files to execute them.

## Key Files

### README.md

The README file provides a summary of the project, its purpose, and its roadmap. It also includes credits and acknowledgments for the use of Amazon State Language.

### package.json

This file contains metadata about the project, such as its name, version, description, and author information. It also lists the project's dependencies and scripts for testing.

### index.js

This is the main entry point of the application. It implements the core functionality of the state machine execution using various modules from the `lib` directory. The file defines state handlers for different state types and manages effects such as logging and state transitions.

### lib Directory

The `lib` directory contains several important modules:

- **utils.js**: Provides utility functions such as `sleep`.
- **constants.js**: Defines enumerations for various statuses, states, and events.
- **io.js**: Contains functions for working with JSONPath and applying data templates.
- **schema.js**: Defines the schema for validating state machine definitions using Joi.
- **rules.js**: Implements various comparison operations and functions for applying rules to data.
- **log.js**: Provides logging functionality for different events in the state machine execution process.

## Examples

The `examples` directory contains example state machine definitions and corresponding JavaScript files to execute them. Here are two key examples:

### basic.json

```json
{
    "StartAt": "Greet",
    "States": {
        "Greet": {
            "Type": "Task",
            "Resource": "greet",
            "InputPath": "$.name",
            "ResultPath": "$.message",
            "Next": "State with long name"
        },
        "State with long name": {
            "Type": "Parallel",
            "Branches": [
                {
                    "StartAt": "A state with an even longer name",
                    "States": {
                        "A state with an even longer name": {
                            "Type": "Choice",
                            "Choices": [
                                {
                                    "Variable": "$.name",
                                    "StringEquals": "Mac",
                                    "Next": "Wait"
                                }
                            ],
                            "Default": "Dismiss"
                        },
                        "Wait": {
                            "Type": "Wait",
                            "Seconds": 1,
                            "Next": "Greet"
                        },
                        "Greet": {
                            "Type": "Task",
                            "Resource": "greet",
                            "InputPath": "$.name",
                            "ResultPath": "$.message",
                            "Next": "Dismiss"
                        },
                        "Dismiss": {
                            "Type": "Task",
                            "Resource": "dismiss",
                            "InputPath": "$.name",
                            "ResultPath": "$.message"
                        }
                    }
                }
            ],
            "OutputPath": "$[0]",
            "Next": "Dismiss"
        },
        "Dismiss": {
            "Type": "Task",
            "Resource": "dismiss",
            "InputPath": "$.name",
            "ResultPath": "$.message",
            "End": true
        }
    }
}
```

### basic.js

```javascript
import { executeMachine } from '../index.js';
import { readFileSync } from 'node:fs';

// Machine definitions are JSON objects that define the state machine's structure.
const machine = JSON.parse(readFileSync('./examples/basic.json'));

// Define a map of named handlers
const handlers = {
    'greet': async (name) => `Hello, ${name}!`,
    'dismiss': async (name) => `Goodbye, ${name}!`
};

try {

    // Context is an object that contains the state machine's execution environment.
    const context = {

        // Add named handlers to context
        handlers,

        // show step-by-step execution log
        quiet: false

    };

    // Define the initial input value for this execution of the state machine.
    const input = { name: 'Mac' };

    // Execute machine w/ context and input
    const [ status, output ] = await executeMachine(machine, context, input);

    console.log('status', status);
    console.log('output', output);

} catch (error) {
    console.error('error', error);
}
```
