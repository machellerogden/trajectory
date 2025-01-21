# Examples

All of the examples herein maybe invoked directly, like so:


```sh
$ node examples/mapIntrinsics.js
│[+]                 [Machine]   [MachineStarted]       { numbers: [ 1, 2, 3, 4, 5 ] }
│[TransformNumbers]  [Map]       [StateInitialized]     { numbers: [ 1, 2, 3, 4, 5 ] }
│[TransformNumbers]  [Map]       [StateEntered]         { numbers: [ 1, 2, 3, 4, 5 ] }
│[TransformNumbers]  [Map]       [HandlerStarted]       { numbers: [ 1, 2, 3, 4, 5 ] }
│[+]                 [Machine]   [MachineStarted]       { item: 1 }
│[+]                 [Machine]   [MachineStarted]       { item: 2 }
│[+]                 [Machine]   [MachineStarted]       { item: 3 }
│[+]                 [Machine]   [MachineStarted]       { item: 4 }
│[+]                 [Machine]   [MachineStarted]       { item: 5 }
│[TransformItem]     [Task]      [StateInitialized]     { item: 1 }
│[TransformItem]     [Task]      [StateInitialized]     { item: 2 }
│[TransformItem]     [Task]      [StateInitialized]     { item: 3 }
│[TransformItem]     [Task]      [StateInitialized]     { item: 4 }
│[TransformItem]     [Task]      [StateInitialized]     { item: 5 }
│[TransformItem]     [Task]      [Parameters]           {
│                                                         'original.$': '$.item',
│                                                         'squared.$': 'States.MathAdd($… { original: 1, squared: 2 }
│[TransformItem]     [Task]      [Parameters]           {
│                                                         'original.$': '$.item',
│                                                         'squared.$': 'States.MathAdd($… { original: 2, squared: 4 }
│[TransformItem]     [Task]      [Parameters]           {
│                                                         'original.$': '$.item',
│                                                         'squared.$': 'States.MathAdd($… { original: 3, squared: 6 }
│[TransformItem]     [Task]      [Parameters]           {
│                                                         'original.$': '$.item',
│                                                         'squared.$': 'States.MathAdd($… { original: 4, squared: 8 }
│[TransformItem]     [Task]      [Parameters]           {
│                                                         'original.$': '$.item',
│                                                         'squared.$': 'States.MathAdd($… { original: 5, squared: 10 }
│[TransformItem]     [Task]      [StateEntered]         { original: 1, squared: 2 }
│[TransformItem]     [Task]      [StateEntered]         { original: 2, squared: 4 }
│[TransformItem]     [Task]      [StateEntered]         { original: 3, squared: 6 }
│[TransformItem]     [Task]      [StateEntered]         { original: 4, squared: 8 }
│[TransformItem]     [Task]      [StateEntered]         { original: 5, squared: 10 }
│[TransformItem]     [Task]      [HandlerStarted]       { original: 1, squared: 2 }
│[TransformItem]     [Task]      [HandlerStarted]       { original: 2, squared: 4 }
│[TransformItem]     [Task]      [HandlerStarted]       { original: 3, squared: 6 }
│[TransformItem]     [Task]      [HandlerStarted]       { original: 4, squared: 8 }
│[TransformItem]     [Task]      [HandlerStarted]       { original: 5, squared: 10 }
│[TransformItem]     [Task]      [HandlerSucceeded]     { original: 1, squared: 2 }
│[TransformItem]     [Task]      [HandlerSucceeded]     { original: 2, squared: 4 }
│[TransformItem]     [Task]      [HandlerSucceeded]     { original: 3, squared: 6 }
│[TransformItem]     [Task]      [HandlerSucceeded]     { original: 4, squared: 8 }
│[TransformItem]     [Task]      [HandlerSucceeded]     { original: 5, squared: 10 }
│[TransformItem]     [Task]      [StateExited]          { original: 1, squared: 2 }
│[TransformItem]     [Task]      [StateExited]          { original: 2, squared: 4 }
│[TransformItem]     [Task]      [StateExited]          { original: 3, squared: 6 }
│[TransformItem]     [Task]      [StateExited]          { original: 4, squared: 8 }
│[TransformItem]     [Task]      [StateExited]          { original: 5, squared: 10 }
│[-]                 [Machine]   [MachineSucceeded]     { original: 1, squared: 2 }
│[-]                 [Machine]   [MachineSucceeded]     { original: 2, squared: 4 }
│[-]                 [Machine]   [MachineSucceeded]     { original: 3, squared: 6 }
│[-]                 [Machine]   [MachineSucceeded]     { original: 4, squared: 8 }
│[-]                 [Machine]   [MachineSucceeded]     { original: 5, squared: 10 }
│[TransformNumbers]  [Map]       [HandlerSucceeded]     [
│                                                         { original: 1, squared: 2 },
│                                                         { original: 2, squared: 4…
│[TransformNumbers]  [Map]       [StateExited]          [
│                                                         { original: 1, squared: 2 },
│                                                         { original: 2, squared: 4…
│[-]                 [Machine]   [MachineSucceeded]     [
│                                                         { original: 1, squared: 2 },
│                                                         { original: 2, squared: 4…
Status: SUCCEEDED
Output: [
  { original: 1, squared: 2 },
  { original: 2, squared: 4 },
  { original: 3, squared: 6 },
  { original: 4, squared: 8 },
  { original: 5, squared: 10 }
]
```
