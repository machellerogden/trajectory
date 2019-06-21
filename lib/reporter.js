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
    error: {
        symbol: logSymbols.error,
        label: 'error',
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
    message,
    depth = 0,
    options: {
        cols = 2
    } = {}
}) => {
    const {
        symbol,
        label,
        color
    } = logTypes[type];
    const pad = chalk.grey(Array(depth * cols).fill(' ').join(''));
    let output = `${pad}${symbol} ${chalk[color](label)} ${chalk.grey('-')} ${chalk.bold(name)}`;
    if (data != null) {
        const serializedData = inspect(data, { colors: true, depth: null });
        output += `${os.EOL}${pad}${serializedData.split(os.EOL).join(`${os.EOL}${pad}`)}`;
    }
    if (message != null) {
        output += `${os.EOL}${chalk.dim(message)}`;
    }
    process[type === 'error' ? 'stderr' : 'stdout'].write(`${output}${os.EOL}`);
};

module.exports = Object.keys(logTypes).reduce((r, t) => (r[t] = Log(t), r), {});
