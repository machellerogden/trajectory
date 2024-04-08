export const compose = (...fns) =>
    (...args) =>
        fns.reduceRight((acc, fn) =>
            fn(acc), fns.pop()(...args));

export const sleep = (ms) =>
    new Promise(resolve => setTimeout(resolve, ms));
