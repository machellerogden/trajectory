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
    final: {
        symbol: logSymbols.info,
        label: 'complete',
        color: 'blue'
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
    stream = false,
    message,
    depth = 0,
    options: {
        cols = 2,
        printLabels = {
            succeed: true,
            start: true,
            info: true,
            fail: true,
            error: true,
            final: true,
            complete: false
        },
        printEvents = {
            succeed: true,
            start: true,
            info: true,
            fail: true,
            error: true,
            final: true,
            complete: false
        }
    } = {}
}) => {
    console.log('type is...', type);
    console.log('data is...', data);
    console.log('stream is...', stream);
    if (!printEvents[type] || stream) return;
    const {
        symbol,
        label,
        color
    } = logTypes[type];
    const pad = chalk.grey(Array(depth * cols).fill(' ').join(''));
    let output = printLabels[type]
        ? `${pad}${symbol} ${chalk[color](label)} ${chalk.grey('-')} ${chalk.bold(name)}`
        : '';
    if (data != null) {
        const serializedData = typeof data === 'string'
            ? data
            : inspect(data, { colors: true, depth: null });
        output += `${printLabels[type] ? os.EOL : ''}${pad}${serializedData.split(os.EOL).join(`${os.EOL}${pad}`)}`;
    }
    if (message != null) {
        output += `${os.EOL}${chalk.dim(message)}`;
    }
    process[type === 'error' ? 'stderr' : 'stdout'].write(`${output}${os.EOL}`);
};

module.exports = Object.keys(logTypes).reduce((r, t) => (r[t] = Log(t), r), {});
