'use strict';

const sleep = s => new Promise(r => setTimeout(() => r(), s));

module.exports = { sleep };
