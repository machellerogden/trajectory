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

    setCanceller(context, cancel) {
        this.cancellers.set(context, cancel);
    }

    deleteCanceller(context) {
        this.cancellers.delete(context);
    }

    withCancel(fn) {
        let cancel;
        const cancelled = new Promise(r => cancel = r);
        const context = fn(cancelled);
        this.setCanceller(context, cancel);
        context.then(() => this.deleteCanceller(context));
        return context;
    }

}

module.exports = { Cancel };
