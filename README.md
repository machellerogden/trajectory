# Trajectory

> A workflow orchestration framework.

**Warning:** This is a work-in-progress and under heavy development. Watch out for falling debris.

## Summary

Trajectory allows you to declare workflows using a data structure that closely mirrors AWS State Language. The basic unit of work is a JavaScript function.

## TODO

- [x] Sequential
- [x] Parallel
- [x] Data pipeline
- [x] Events
- [x] Built-In Reporter
- [x] IO Control Flow
- [ ] Retry *working but needs refactor*
- [ ] Catch
- [ ] Timeout
- [ ] Choice
- [ ] Cancel all scheduled work on across all branches on uncaught errors
- [ ] Update queue specification to reflect latest Joi schema
