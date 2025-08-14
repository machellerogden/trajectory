export const sleep = (ms) =>
    new Promise(resolve => setTimeout(resolve, ms));

/**
 * Deep clones objects to prevent concurrent handlers from mutating shared state.
 * 
 * Pass by reference (not cloned):
 * - Functions
 * - Class instances (any object with constructor !== Object)
 * - Map and Set instances (preserve reference semantics)
 * - WeakMap, WeakSet, Promise (cannot be meaningfully cloned)
 * 
 * Cloned (new instances created):
 * - Plain objects {}
 * - Arrays []
 * - Dates, RegExp, Errors
 * - Buffers, TypedArrays
 * 
 * This allows handlers to safely mutate plain data structures while preserving
 * intentionally shared services, caches, and other stateful objects.
 */
export function deepClone(x, visited = new WeakMap()) {
    // Primitives and functions: return as-is
    if (x === null || typeof x !== "object") return x;
    if (typeof x === "function") return x;

    // Cycles
    if (visited.has(x)) return visited.get(x);

    // Arrays
    if (Array.isArray(x)) {
        const out = [];
        visited.set(x, out);
        for (const item of x) out.push(deepClone(item, visited));
        return out;
    }

    // Sets - pass by reference (like class instances)
    if (x instanceof Set) {
        return x;
    }

    // Maps - pass by reference (like class instances)
    if (x instanceof Map) {
        return x;
    }

    // Dates
    if (x instanceof Date) return new Date(x.getTime());

    // RegExps
    if (x instanceof RegExp) {
        const out = new RegExp(x.source, x.flags);
        out.lastIndex = x.lastIndex;
        return out;
    }

    // Typed arrays (but not DataView)
    if (ArrayBuffer.isView(x) && !(x instanceof DataView)) {
        return new x.constructor(x);
    }

    // ArrayBuffer
    if (x instanceof ArrayBuffer) {
        return x.slice(0);
    }

    // DataView
    if (x instanceof DataView) {
        return new DataView(x.buffer.slice(0), x.byteOffset, x.byteLength);
    }

    // Node.js Buffer (if present)
    if (typeof Buffer !== "undefined" && Buffer.isBuffer && Buffer.isBuffer(x)) {
        return Buffer.from(x);
    }

    // Errors
    if (x instanceof Error) {
        const out = new x.constructor(x.message);
        visited.set(x, out);
        for (const key of Reflect.ownKeys(x)) {
            const desc = Object.getOwnPropertyDescriptor(x, key);
            if (!desc) continue;
            if ("value" in desc) desc.value = deepClone(desc.value, visited);
            Object.defineProperty(out, key, desc);
        }
        return out;
    }

    // Promise / WeakMap / WeakSet / many host objects — return ref
    const tag = Object.prototype.toString.call(x);
    if (
        tag === "[object Promise]" ||
            tag === "[object WeakMap]" ||
            tag === "[object WeakSet]" ||
            (typeof x.nodeType === "number" && typeof x.cloneNode === "function")
    ) {
        return x;
    }

    // URL / URLSearchParams
    if (typeof URL !== "undefined" && x instanceof URL) return new URL(x.toString());
    if (typeof URLSearchParams !== "undefined" && x instanceof URLSearchParams)
        return new URLSearchParams(x.toString());

    // Check if this is a class instance (not plain Object)
    // If it has a constructor that's not Object, treat it as a class instance and pass by reference
    const proto = Object.getPrototypeOf(x);
    if (proto && proto.constructor && proto.constructor !== Object) {
        // This appears to be a class instance, not a plain object
        // Return it by reference instead of cloning
        return x;
    }

    // Objects: preserve prototype and all property descriptors (incl. symbols)
    const out = Object.create(proto);
    visited.set(x, out);

    for (const key of Reflect.ownKeys(x)) {
        const desc = Object.getOwnPropertyDescriptor(x, key);
        if (!desc) continue;
        if ("value" in desc) desc.value = deepClone(desc.value, visited);
        Object.defineProperty(out, key, desc);
    }

    return out;
}

export async function concurrencyLimitedMap(items, concurrency, iteratee) {
    const results = new Array(items.length);
    let index = 0;
    let active = 0;

    return new Promise((resolve, reject) => {
        function launchNext() {
            if (index >= items.length) {
                if (active === 0) resolve(results);
                return;
            }
            const currentIndex = index++;
            active++;

            iteratee(items[currentIndex], currentIndex)
                .then((res) => {
                    results[currentIndex] = res;
                })
                .catch((err) => {
                    //results[currentIndex] = { error: res };
                    reject(err);
                })
                .finally(() => {
                    active--;
                    launchNext();
                });

            // If we can launch more tasks simultaneously, do so
            if (active < concurrency) {
                launchNext();
            }
        }

        // Start up
        if (items.length === 0 || concurrency <= 0) {
            // Edge cases: no items or concurrency=0
            resolve(results);
        } else {
            launchNext();
        }
    });
}

export async function tolerantConcurrencyLimitedMap(
    items,
    concurrency,
    iteratee,
    { maxFailures = 0, maxFailurePercentage = null, signal: externalSignal } = {}
) {
    // If there are no items or concurrency <= 0, return early
    if (items.length === 0 || concurrency <= 0) {
        return new Array(items.length);
    }

    const results = new Array(items.length);
    const total = items.length;
    let currentIndex = 0;
    let failureCount = 0;

    // Create an AbortController so we can cancel in-flight tasks early
    const controller = new AbortController();
    const { signal } = controller;

    // If external signal is provided, abort when it aborts
    if (externalSignal) {
        externalSignal.addEventListener('abort', () => {
            controller.abort();
        });

        // Check if already aborted
        if (externalSignal.aborted) {
            controller.abort();
        }
    }

    // This "worker" will repeatedly pull the next index, process it, and stop when:
    // 1) There are no more items
    // 2) The signal is aborted (i.e., we hit failure thresholds)
    async function worker() {
        while (true) {
            // If we've processed all items or been aborted, exit the loop
            if (currentIndex >= total || signal.aborted) {
                return;
            }

            // Get the next index from the shared counter
            const index = currentIndex++;
            try {
                // Allow the iteratee to see the abort signal
                const result = await iteratee(items[index], index, signal);
                if (!signal.aborted) {
                    results[index] = result;
                }
            } catch (err) {
                if (signal.aborted) {
                    return;
                }

                failureCount++;
                results[index] = { error: err };

                const failPct = (failureCount / total) * 100;
                // If we exceed failure limits, abort remaining work and rethrow
                if (failureCount > maxFailures
                    || (maxFailurePercentage != null
                        && failPct > maxFailurePercentage)) {
                    controller.abort();
                    throw err;
                }
            }
        }
    }

    // Create a pool of worker tasks respecting concurrency
    const workerPool = Array.from({ length: Math.min(concurrency, total) }, () => worker());

    // If any worker throws (because failure threshold was reached), we let that error bubble up.
    // Otherwise, once all workers finish, we have our complete results array.
    await Promise.allSettled(workerPool);

    // If the controller was aborted, at least one worker must have thrown,
    // so find the first error in results or just throw a generic error if needed.
    if (signal.aborted) {
        const firstErrorEntry = results.find(r => r && r.error);
        if (firstErrorEntry?.error) {
            throw firstErrorEntry.error;
        } else {
            throw new Error('Aborted due to exceeding failure thresholds.');
        }
    }

    return results;
}
