# Queue Specification

# Descriptor Syntax

TypeScript is used below to describe the specification. TypeScript is prefered here over something like EBNF in hopes that it will be more approachable. Please note trajectory is not implemented in TypeScript. Typescript appears here solely to act as a descriptor syntax.

```
interface QueueDefinition {
    kind: 'queue';
    version: string;
    spec: Queue;
}

interface Queue {
    startsAt: string;
    states: States;
}

interface States {
    [index: string]: State;
}

type State = Pass | Task | Choice | Wait | Succeed | Fail | Parallel;

interface BaseState {
    next?: string;
    end?: boolean;
    inputPath?: string;
    outputPath?: string;
    comment?: string;
}

interface Pass extends BaseState {
    type: 'pass';
    result?: any;
    resultPath?: string;
    parameters?: any;
}

interface Task extends BaseState {
    type: 'task';
    fn: (io: object) => any;
    resultPath?: string;
    parameters?: any;
    retry?: object;
    catch?: object;
    timeout?: number;
}

interface Choice extends BaseState {
    type: 'choice';
    choices?: object[];
    default?: string;
}

interface Wait extends BaseState {
    type: 'wait';
    seconds?: number;
    timestamp?: string;
    secondsPath?: string;
    timestampPath?: string;
}

interface Succeed extends BaseState {
    type: 'succeed';
}

interface Fail extends BaseState {
    type: 'fail';
    error?: string;
    cause?: string;
}

interface Parallel extends BaseState {
    type: 'parallel';
    branches?: object;
    resultPath?: string;
    retry?: object;
    catch?: object;
}
```

# Credits

The queue specification as defined herein is a modified version of Amazon State
Language. Required copyright notice and permission notice follow.

Copyright © 2016 Amazon.com Inc. or Affiliates.

Permission is hereby granted, free of charge, to any person obtaining a copy of this specification and associated documentation files (the “specification”), to use, copy, publish, and/or distribute, the Specification) subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies of the Specification.

You may not modify, merge, sublicense, and/or sell copies of the Specification.

THE SPECIFICATION IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SPECIFICATION OR THE USE OR OTHER DEALINGS IN THE SPECIFICATION.​

Any sample code included in the Specification, unless otherwise specified, is licensed under the Apache License, Version 2.0.
