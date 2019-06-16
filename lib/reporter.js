'use strict';

const chalk = require('chalk');
const { inspect } = require('util');
const logSymbols = require('log-symbols');
const os = require('os');

const logTypeMap = {
    succeed: {
        symbol: 'success',
        label: 'success',
        color: 'green'
    },
    start: {
        symbol: 'info',
        label: 'start',
        color: 'blue'
    },
    info: {
        symbol: 'info',
        label: 'info',
        color: 'blue'
    },
    fail: {
        symbol: 'error',
        label: 'fail',
        color: 'red'
    }
};

const Log = type => ({
    name,
    data,
    indent = 0
}) => {
    const {
        symbol,
        label,
        color
    } = logTypeMap[type];
    const pad = `${chalk.grey(Array(indent > 0 ? indent - 1 : indent).fill('').join('·'))}${indent === 0 ? '' : ' '}`;
    let msg = `${pad}${logSymbols[symbol]} ${chalk[color](label)} ${chalk.grey('-')} ${chalk.bold(name)}`;
    if (data != null) msg += `${os.EOL}${pad}${inspect(data, { colors: true }).split(os.EOL).join(`${os.EOL}${pad}`)}`;
    console.log(msg);
};

module.exports = {
    start: Log('start'),
    info: Log('info'),
    succeed: Log('succeed'),
    fail: Log('fail')
};
