const Enum = (...s) => s.reduce((a, v) => (a[v] = v, a), {});

export const STATUS = Enum('OK', 'ERROR');
export const STATE = Enum('FAILED', 'SUCCEEDED');
export const EVENT = Enum('StateInfo', 'StateSucceed', 'StateFail', 'MachineStart', 'MachineSucceed', 'MachineFail');
