'use strict';


const { Schema } = require('./lib/schema');
const { Scheduler, exec } = require('./lib/scheduler');
const bus = require('./lib/bus');

module.exports = { execute };

async function execute(definition, input) {
    bus.start();
    const { spec:queue } = await Schema.validate(definition);
    const results = [ input, ...(await exec(queue, input, bus)) ];
    return results;
}
