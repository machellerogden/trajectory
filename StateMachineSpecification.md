# State Machine Specification

```typescript
interface StateMachine {
    StartAt: string;
    States: States;
    Comment?: string;
}

interface States {
    [index: string]: State;
}

type State = Pass | Task | Choice | Wait | Succeed | Fail | Parallel | Map;

interface BaseState {
    Next?: string;
    End?: boolean;
    InputPath?: string;
    OutputPath?: string;
    Comment?: string;
}

interface Pass extends BaseState {
    Type: 'Pass';
    Result?: any;
    ResultPath?: string;
    Parameters?: any;
}

interface Task extends BaseState {
    Type: 'Task';
    Resource: string;
    ResultPath?: string;
    Parameters?: any;
    Retry?: object[];
    Catch?: object[];
    Timeout?: number;
}

interface Choice extends BaseState {
    Type: 'Choice';
    Choices?: object[];
    Default?: string;
}

interface Wait extends BaseState {
    Type: 'Wait';
    Seconds?: number;
    Timestamp?: string;
    SecondsPath?: string;
    TimestampPath?: string;
}

interface Succeed extends BaseState {
    Type: 'Succeed';
}

interface Fail extends BaseState {
    Type: 'Fail';
    Error?: string;
    Cause?: string;
}

interface Parallel extends BaseState {
    Type: 'Parallel';
    Branches: StateMachine[];
    ResultPath?: string;
    Retry?: object[];
    Catch?: object[];
}

interface Map extends BaseState {
    Type: 'Map';
    ItemsPath: string;
    ItemProcessor: StateMachine[];
    ItemSelector?: string;
    ResultSelector?: string;
    MaxConcurrency?: number;
    ResultPath?: string;
    Retry?: object[];
    Catch?: object[];
}
```
