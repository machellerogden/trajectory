'use strict';

const sleep = s => new Promise(r => setTimeout(() => r(), s * 1000));

module.exports = { sleep };
