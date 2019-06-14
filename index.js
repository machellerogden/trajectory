'use strict';


const { Schema } = require('./lib/schema');
const { Scheduler, exec } = require('./lib/scheduler');

module.exports = { execute };

async function execute(definition, input) {
    const { spec:queue } = await Schema.validate(definition);
    const results = [ input, ...(await exec(queue, input)) ];
    return results;
}
