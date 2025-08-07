export const sleep = (ms) =>
    new Promise(resolve => setTimeout(resolve, ms));

export function deepClone(x, visited = new WeakMap()) {
    if (x === null || typeof x !== 'object') return x;
    if (visited.has(x)) return visited.get(x);

    let cloned;

    if (Array.isArray(x)) {
        cloned = [];
        visited.set(x, cloned);
        for (const item of x) {
            cloned.push(deepClone(item, visited));
        }
        return cloned;

    } else if (x instanceof Set) {
        cloned = new Set();
        visited.set(x, cloned);
        for (const item of x) {
            cloned.add(deepClone(item, visited));
        }
        return cloned;

    } else if (x instanceof Map) {
        cloned = new Map();
        visited.set(x, cloned);
        for (const [k, v] of x) {
            cloned.set(deepClone(k, visited), deepClone(v, visited));
        }
        return cloned;

    } else if (x instanceof Date) {
        return new Date(x.getTime());

    } else if (x instanceof RegExp) {
        const clonedRegex = new RegExp(x.source, x.flags);
        clonedRegex.lastIndex = x.lastIndex;
        return clonedRegex;

    } else if (ArrayBuffer.isView(x) && !(x instanceof DataView)) {
        return new x.constructor(x);

    } else if (x instanceof ArrayBuffer) {
        return x.slice(0);

    } else if (x instanceof DataView) {
        return new DataView(x.buffer.slice(0), x.byteOffset, x.byteLength);

    } else {
        // Plain Object (or something else)
        cloned = {};
        visited.set(x, cloned);
        for (const [k, v] of Object.entries(x)) {
            cloned[k] = deepClone(v, visited);
        }
        return cloned;
    }
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
