import { ERROR } from './constants.js';

export class StatesError extends Error {
    constructor(errorType, message, originalError) {
        super(message || errorType);
        this.name = errorType;
        
        // Preserve the original error's stack trace if provided
        if (originalError instanceof Error) {
            this.stack = originalError.stack;
            this.cause = originalError; // Maintain error chaining
            
            // Copy any custom properties from the original error
            Object.getOwnPropertyNames(originalError).forEach(prop => {
                if (!['name', 'message', 'stack'].includes(prop)) {
                    this[prop] = originalError[prop];
                }
            });
        }
    }
}

// Simple helper function to create common error types
export function createStatesError(errorType, message, originalError) {
    // Use default messages for common error types
    if (!message) {
        switch (errorType) {
            case ERROR.States.Timeout:
                message = 'Task timed out';
                break;
            case ERROR.States.TaskFailed:
                message = 'Task execution failed';
                break;
            case ERROR.States.HeartbeatTimeout:
                message = 'Task heartbeat timed out';
                break;
            case ERROR.States.Permissions:
                message = 'Insufficient permissions';
                break;
            case ERROR.States.ResultPathMatchFailure:
                message = 'ResultPath match failed';
                break;
            case ERROR.States.ParameterPathFailure:
                message = 'Parameter path resolution failed';
                break;
            case ERROR.States.QueryEvaluationError:
                message = 'Query evaluation error';
                break;
            case ERROR.States.BranchFailed:
                message = 'Branch execution failed';
                break;
            case ERROR.States.NoChoiceMatched:
                message = 'No choice rule matched';
                break;
            case ERROR.States.IntrinsicFailure:
                message = 'Intrinsic function failed';
                break;
            case ERROR.States.ExceedToleratedFailureThreshold:
                message = 'Exceeded tolerated failure threshold';
                break;
            case ERROR.States.ItemReaderFailed:
                message = 'Item reader failed';
                break;
            case ERROR.States.ResultWriterFailed:
                message = 'Result writer failed';
                break;
        }
    }
    
    return new StatesError(errorType, message, originalError);
}
