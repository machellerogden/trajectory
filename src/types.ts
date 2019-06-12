export interface QueueDefinition {
    kind: 'queue';
    spec: Queue;
}

export interface Queue {
    [index: number]: States;
}

export interface States {
    [index: string]: State;
}

export interface State {
    fn: (io: object) => any;

    next?: string;
    end?: string;

    inputPath?: string;
    outputPath?: string;
    resultPath?: string;

    comment?: string;

    retry?: object;
    catch?: object;
    timeout?: number;

    choices?: object;
    default?: object;

    cause?: string;

    timestamp?: string;
    branches?: object;
}

//export interface State {
    //fn: (io: object, Reflect: object) => any;
//}
