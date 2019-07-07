# State Machine Specification

> This is work-in-progress and currently is incomplete.

# Descriptor Syntax

TypeScript is used below to describe the specification. TypeScript is prefered here over something like EBNF in hopes that it will be more approachable. Please note trajectory is not implemented in TypeScript. Typescript appears here solely to act as a descriptor syntax.

```
interface StateMachine {
    StartsAt: string;
    States: States;
}

interface States {
    [index: string]: State;
}

type State = Pass | Task | Choice | Wait | Succeed | Fail | Parallel;

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
    Catch?: object;
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
    Branches?: object;
    ResultPath?: string;
    Retry?: object;
    Catch?: object;
}
```
