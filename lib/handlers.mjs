'use strict';

import compose from 'lodash/fp/compose';

import { IOCtrl } from './io';
import { findChoice } from './rules';

export function Handlers(context) {

    const {
        applyParameters,
        fromInput,
        fromOutput,
        toResult,
        delayOutput,
        processInput,
        processOutput,
        processIO
    } = IOCtrl(context);

    return {
        async Task(state, io) {
            const fn = typeof state.Resource === 'function'
                ? state.Resource
                : context.resources[state.Resource];
            const cancellableFn = state.TimeoutSeconds == null
                ? io => context.cc.Cancellable(onCancel => fn(io, { Resource: state.Resource, onCancel }))
                : io => context.cc.Perishable(onCancel => fn(io, { Resource: state.Resource, onCancel }), state.TimeoutSeconds * 1000);
            return compose(processOutput, cancellableFn, processInput)(io);
        },
        async Pass(state, io) {
            return processIO(io);
        },
        async Wait(state, io) {
            return compose(fromOutput, delayOutput, fromInput)(io);
        },
        async Parallel(state, io) {
            context.depth++;
            const input = fromInput(io);
            const output = await Promise.all(state.Branches.map(async branch => {
                const branchResult = await context.executeStateMachine(branch, input);
                return branchResult.map(({ data }) => data);
            }));
            context.depth--;
            return processOutput(output);
        },
        async Choice(state, io) {
            const choice = findChoice(state.Choices, io);
            const Next = choice == null
                ? state.Default
                : choice.Next;
            if (Next == null) throw new Error(`no where to go`);
            delete state.End;
            state.Next = Next;
            return compose(fromOutput, fromInput)(io);
        },
        async Succeed(state, io) {
            return compose(fromOutput, fromInput)(io);
        }
    };
}
