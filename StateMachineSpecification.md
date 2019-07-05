# State Machine Specification

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

# Credits

The state machine specification as defined herein is a slightly modified version of Amazon State Language. Required copyright notice and permission notice follow.

Copyright © 2016 Amazon.com Inc. or Affiliates.

Permission is hereby granted, free of charge, to any person obtaining a copy of this specification and associated documentation files (the “specification”), to use, copy, publish, and/or distribute, the Specification) subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies of the Specification.

You may not modify, merge, sublicense, and/or sell copies of the Specification.

THE SPECIFICATION IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SPECIFICATION OR THE USE OR OTHER DEALINGS IN THE SPECIFICATION.​

Any sample code included in the Specification, unless otherwise specified, is licensed under the Apache License, Version 2.0.
