'use strict';


const sleep = seconds =>
    new Promise(resolve =>
        setTimeout(resolve, seconds * 1000));

module.exports = { sleep };
