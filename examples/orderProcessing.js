import { executeMachine } from '../index.js';
import { readFileSync } from 'node:fs';

const machine = JSON.parse(readFileSync('./examples/orderProcessing.json'));

const handlers = {
    'validateOrder': async (order) => order,
    'processPayment': async (order) => ({ success: true }),
    'checkStock': async (order) => ({ available: true }),
    'shipOrder': async (order) => ({ orderId: order.id, trackingNumber: '123' }),
    'notifyOutOfStock': async () => {},
    'cancelOrder': async () => {},
};

try {

    const context = {
        handlers,
        quiet: false
    };

    const input ={
        id: '123',
        items: [ 'item1', 'item2' ]
    };

    const [ status, output ] = await executeMachine(machine, context, input);

    console.log('status', status);
    console.log('output', output);

} catch (error) {
    console.error('error', error);
}
