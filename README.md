# Trajectory

> A workflow orchestration framework.

**Warning:** This is a work-in-progress and under heavy development. Watch out for falling debris.

## Summary

Trajectory allows you to execute workflows defined in [Amazon State Language](https://docs.aws.amazon.com/step-functions/latest/dg/concepts-amazon-states-language.html) (ASL). If you already are familiar with ASL then you'll have no trouble using Trajectory.

The [Amazon State Language Specification](https://states-language.net/spec.html) was developed as a language for defining State Machines in AWS Step Functions. Trajectory repurposes ASL for executing JavaScript function. Where AWS Step Functions invoke lambdas, activities, and connectors, Trajectory simply invokes JavaScript functions.

## TODO

- [x] Sequential
- [x] Parallel
- [x] Data pipeline
- [x] Events
- [x] Built-In Reporter
- [x] IO Control Flow
- [x] Retry
- [x] Catch
- [ ] Error enums
- [x] Timeout
- [x] Choice
- [x] Cancel all scheduled work on across all branches on uncaught errors
- [ ] Update state machine specification to reflect latest Joi schema

# Credits

The state machine specification used herein is Amazon State Language. Required copyright notice and permission notice follow.

Copyright © 2016 Amazon.com Inc. or Affiliates.

Permission is hereby granted, free of charge, to any person obtaining a copy of this specification and associated documentation files (the “specification”), to use, copy, publish, and/or distribute, the Specification) subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies of the Specification.

You may not modify, merge, sublicense, and/or sell copies of the Specification.

THE SPECIFICATION IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SPECIFICATION OR THE USE OR OTHER DEALINGS IN THE SPECIFICATION.​

Any sample code included in the Specification, unless otherwise specified, is licensed under the Apache License, Version 2.0.
