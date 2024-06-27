export class StatesError extends Error {
    constructor(name, message) {
        super(message);
        this.name = name;
    }
}
