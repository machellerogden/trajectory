const Enum = (...s) => s.reduce((a, v) => {
    const parts = v.split('.');
    const last = parts.pop();
    const path = parts.reduce((o, p) => o[p] = o[p] || {}, a);
    path[last] = v;
    return a;
}, {});

export const STATUS = Enum('OK', 'ERROR');
export const STATE = Enum('FAILED', 'SUCCEEDED');
export const EVENT = Enum('StateInfo', 'StateSucceed', 'StateFail', 'MachineStart', 'MachineSucceed', 'MachineFail');
export const ERROR = Enum(
    'States.ALL',
    'States.HeartbeatTimeout',
    'States.Timeout',
    'States.TaskFailed',
    'States.Permissions',
    'States.ResultPathMatchFailure',
    'States.ParameterPathFailure',
    'States.QueryEvaluationError',
    'States.BranchFailed',
    'States.NoChoiceMatched',
    'States.IntrinsicFailure',
    'States.ExceedToleratedFailureThreshold',
    'States.ItemReaderFailed',
    'States.ResultWriterFailed'
);
