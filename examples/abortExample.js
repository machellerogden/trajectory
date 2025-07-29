import { executeMachine } from '../index.js';

// Example demonstrating how to cancel a running workflow using AbortController

const machine = {
    "StartAt": "ProcessData",
    "States": {
        "ProcessData": {
            "Type": "Parallel",
            "Branches": [
                {
                    "StartAt": "AnalyzeData",
                    "States": {
                        "AnalyzeData": {
                            "Type": "Task",
                            "Resource": "analyzeData",
                            "End": true
                        }
                    }
                },
                {
                    "StartAt": "TransformData",
                    "States": {
                        "TransformData": {
                            "Type": "Task",
                            "Resource": "transformData",
                            "End": true
                        }
                    }
                },
                {
                    "StartAt": "ValidateData",
                    "States": {
                        "ValidateData": {
                            "Type": "Task",
                            "Resource": "validateData",
                            "End": true
                        }
                    }
                }
            ],
            "End": true
        }
    }
};

// Define handlers that respect the abort signal
const handlers = {
    analyzeData: async (input, signal) => {
        console.log('Starting data analysis...');
        
        // Simulate a long-running analysis
        for (let i = 0; i < 10; i++) {
            // Check if we should abort
            if (signal?.aborted) {
                console.log('Data analysis was cancelled!');
                throw new Error('Analysis aborted');
            }
            
            console.log(`Analyzing chunk ${i + 1}/10...`);
            await new Promise((resolve, reject) => {
                const timeout = setTimeout(resolve, 500);
                
                // Listen for abort signal
                if (signal) {
                    signal.addEventListener('abort', () => {
                        clearTimeout(timeout);
                        reject(new Error('Analysis aborted'));
                    }, { once: true });
                }
            });
        }
        
        return { analysis: 'complete' };
    },
    
    transformData: async (input, signal) => {
        console.log('Starting data transformation...');
        
        // Simulate transformation work
        await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                console.log('Data transformation complete');
                resolve();
            }, 3000);
            
            if (signal) {
                signal.addEventListener('abort', () => {
                    clearTimeout(timeout);
                    console.log('Data transformation was cancelled!');
                    reject(new Error('Transformation aborted'));
                }, { once: true });
            }
        });
        
        return { transformation: 'complete' };
    },
    
    validateData: async (input, signal) => {
        console.log('Starting data validation...');
        
        // Simulate validation work
        await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                console.log('Data validation complete');
                resolve();
            }, 2000);
            
            if (signal) {
                signal.addEventListener('abort', () => {
                    clearTimeout(timeout);
                    console.log('Data validation was cancelled!');
                    reject(new Error('Validation aborted'));
                }, { once: true });
            }
        });
        
        return { validation: 'complete' };
    }
};

// Example 1: Normal execution without cancellation
console.log('\n=== Example 1: Normal execution ===');
try {
    const context = {
        handlers,
        quiet: true
    };
    
    const [status, output] = await executeMachine(machine, context, {});
    console.log('Workflow completed successfully!');
    console.log('Status:', status);
    console.log('Output:', output);
} catch (error) {
    console.error('Error:', error);
}

// Example 2: Cancelling execution with AbortController
console.log('\n=== Example 2: Cancelled execution ===');
try {
    const context = {
        handlers,
        quiet: true
    };
    
    // Create an AbortController
    const controller = new AbortController();
    
    // Add signal to context
    context.signal = controller.signal;
    
    // Start the workflow
    console.log('Starting workflow...');
    const executionPromise = executeMachine(machine, context, {});
    
    // Cancel after 1.5 seconds
    setTimeout(() => {
        console.log('\n*** Sending abort signal! ***\n');
        controller.abort();
    }, 1500);
    
    const [status, output] = await executionPromise;
    console.log('Status:', status);
    console.log('Output:', output);
} catch (error) {
    console.error('Error:', error);
}

// Example 3: Map state with cancellation
console.log('\n=== Example 3: Map state with cancellation ===');
const mapMachine = {
    "StartAt": "ProcessItems",
    "States": {
        "ProcessItems": {
            "Type": "Map",
            "ItemsPath": "$.items",
            "MaxConcurrency": 2,
            "ItemProcessor": {
                "StartAt": "ProcessItem",
                "States": {
                    "ProcessItem": {
                        "Type": "Task",
                        "Resource": "processItem",
                        "End": true
                    }
                }
            },
            "End": true
        }
    }
};

const mapHandlers = {
    processItem: async (input, signal) => {
        console.log(`Processing item ${input}...`);
        
        await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                console.log(`Item ${input} processed`);
                resolve();
            }, 1000);
            
            if (signal) {
                signal.addEventListener('abort', () => {
                    clearTimeout(timeout);
                    console.log(`Item ${input} processing cancelled!`);
                    reject(new Error('Item processing aborted'));
                }, { once: true });
            }
        });
        
        return `Processed: ${input}`;
    }
};

try {
    const context = {
        handlers: mapHandlers,
        quiet: true
    };
    
    const input = {
        items: [1, 2, 3, 4, 5, 6, 7, 8]
    };
    
    const controller = new AbortController();
    
    // Add signal to context
    context.signal = controller.signal;
    
    console.log('Starting Map state processing...');
    const executionPromise = executeMachine(mapMachine, context, input);
    
    // Cancel after 2.5 seconds
    setTimeout(() => {
        console.log('\n*** Aborting Map execution! ***\n');
        controller.abort();
    }, 2500);
    
    const [status, output] = await executionPromise;
    console.log('Status:', status);
    console.log('Output:', output);
} catch (error) {
    console.error('Error:', error);
}