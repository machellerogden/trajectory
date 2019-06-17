'use strict';

const chalk = require('chalk');
const { inspect } = require('util');
const logSymbols = require('log-symbols');
const os = require('os');

const logTypes = {
    succeed: {
        symbol: logSymbols.success,
        label: 'success',
        color: 'green'
    },
    start: {
        symbol: chalk.yellow('•'),
        label: 'start',
        color: 'yellow'
    },
    info: {
        symbol: logSymbols.info,
        label: 'info',
        color: 'blue'
    },
    fail: {
        symbol: logSymbols.error,
        label: 'fail',
        color: 'red'
    },
    complete: {
        symbol: logSymbols.info,
        label: 'complete',
        color: 'blue'
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
    } = logTypes[type];
    const pad = chalk.grey(Array(indent).fill(' ').join(''));
    let msg = `${pad}${symbol} ${chalk[color](label)} ${chalk.grey('-')} ${chalk.bold(name)}`;
    if (data != null) {
        const serializedData = inspect(data, { colors: true, depth: null });
        msg += `${os.EOL}${pad}${serializedData.split(os.EOL).join(`${os.EOL}${pad}`)}`;
    }
    process[type === 'error' ? 'stderr' : 'stdout'].write(`${msg}${os.EOL}`);
};

module.exports = Object.keys(logTypes).reduce((r, t) => (r[t] = Log(t), r), {});
