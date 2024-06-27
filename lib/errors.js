import { ERROR } from './constants.js';

class StatesError extends Error {
    constructor(name, message) {
        super(message);
        this.name = name;
    }
}

export const StatesErrors = {
    Timeout: new StatesError(ERROR.States_Timeout, 'State execution timed out'),
    TaskFailed: new StatesError(ERROR.States_TaskFailed, 'Task failed during execution'),
};

export default StatesError;
