const Enum = (...s) => s.reduce((a, v) => (a[v.replace(/\./g, '_')] = v, a), {});

export const STATUS = Enum('OK', 'ERROR');
export const STATE = Enum('FAILED', 'SUCCEEDED');
export const EVENT = Enum('StateInfo', 'StateSucceed', 'StateFail', 'MachineStart', 'MachineSucceed', 'MachineFail');
export const ERROR = Enum('States.Timeout', 'States.TaskFailed');
