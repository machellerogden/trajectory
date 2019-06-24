'use strict';

class Cancel {

    constructor() {
        this.cancellers = new Map();
    }

    cancel(context) {
        this.cancellers.get(context)();
    }

    cancelAll() {
        this.cancellers.forEach(c => c());
    }

    setContext(context, cancel) {
        this.cancellers.set(context, cancel);
    }

    deleteContext(context) {
        this.cancellers.delete(context);
    }

    cancellable(fn) {
        let cancel;
        const whenCancelled = new Promise(r => cancel = r);
        const context = fn(whenCancelled);
        this.setContext(context, cancel);
        context.then(() => this.deleteContext(context));
        return context;
    }

}

module.exports = { Cancel };
