'use strict';

import test from 'ava';
import sinon from 'sinon';
import { Trajectory } from '..';

test.beforeEach(t => t.context = { sandbox: sinon.createSandbox() });
test.afterEach(t => t.context.sandbox.restore());

test('stub', t => t.pass());
//test('should execute basic sequential tasks', async t => {
    //t.plan(4);
    //const a = t.context.sandbox.fake.returns({ a: 'a' });
    //const b = t.context.sandbox.fake.returns({ b: 'b' });
    //const c = t.context.sandbox.fake.returns({ c: 'c' });
    //const definition = {
        //kind: 'queue',
        //version: '1.0.0',
        //spec: {
            //startAt: 'a',
            //states: {
                //a: {
                    //type: 'task',
                    //fn: a,
                    //next: 'b'
                //},
                //c: {
                    //type: 'task',
                    //fn: c,
                    //end: true
                //},
                //b: {
                    //type: 'task',
                    //fn: b,
                    //next: 'c'
                //}
            //}
        //}
    //};
    //const results = await execute(definition);
    //t.assert(a.calledOnce);
    //t.assert(b.calledOnce);
    //t.assert(c.calledOnce);
    //t.deepEqual(results, [ void 0, { a: 'a' }, { b: 'b' }, { c: 'c' } ]);
//});

//test('should thread io through states', async t => {
    //t.plan(4);
    //const a = t.context.sandbox.fake.returns({ a: 'a' });
    //const b = t.context.sandbox.fake.returns({ b: 'b' });
    //const c = t.context.sandbox.fake.returns({ c: 'c' });
    //const definition = {
        //kind: 'queue',
        //version: '1.0.0',
        //spec: {
            //startAt: 'a',
            //states: {
                //a: {
                    //type: 'task',
                    //fn: a,
                    //next: 'b'
                //},
                //c: {
                    //type: 'task',
                    //fn: c,
                    //end: true
                //},
                //b: {
                    //type: 'task',
                    //fn: b,
                    //next: 'c'
                //}
            //}
        //}
    //};
    //const results = await execute(definition, 'initial');
    //t.assert(a.calledWith('initial'));
    //t.assert(b.calledWith({ a: 'a' }));
    //t.assert(c.calledWith({ b: 'b' }));
    //t.deepEqual(results, [ 'initial', { a: 'a' }, { b: 'b' }, { c: 'c' } ]);
//});

//test('should handle parallel executions', async t => {
    //t.plan(3);
    //const b = t.context.sandbox.fake.returns({ b: 'b' });
    //const c = t.context.sandbox.fake.returns({ c: 'c' });
    //const definition = {
        //kind: 'queue',
        //version: '1.0.0',
        //spec: {
            //startAt: 'a',
            //states: {
                //a: {
                    //type: 'parallel',
                    //branches: [
                        //{
                            //startAt: 'b',
                            //states: {
                                //b: {
                                    //type: 'task',
                                    //fn: b,
                                    //end: true
                                //}
                            //}
                        //},
                        //{
                            //startAt: 'c',
                            //states: {
                                //c: {
                                    //type: 'task',
                                    //fn: c,
                                    //end: true
                                //}
                            //}
                        //}
                    //],
                    //next: 'd'
                //},
                //d: {
                    //type: 'succeed'
                //}
            //}
        //}
    //};
    //const results = await execute(definition, 'initial');
    //t.assert(b.calledWith('initial'));
    //t.assert(c.calledWith('initial'));

    //t.deepEqual(results, [ 'initial', [ [ { b: 'b' } ], [ { c: 'c' } ] ], [ [ { b: 'b' } ], [ { c: 'c' } ] ] ]);
//});
