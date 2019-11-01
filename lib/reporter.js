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
    },
    stdout: {
        symbol: logSymbols.info,
        label: 'stdout',
        color: 'grey'
    },
    stderr: {
        symbol: logSymbols.error,
        label: 'stderr',
        color: 'red'
    }
};

const Log = type => ({
    name,
    data,
    message,
    streamed,
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
            complete: false,
            stdout: true,
            stderr: true
        },
        printEvents = {
            succeed: true,
            start: true,
            info: true,
            fail: true,
            error: true,
            final: true,
            complete: false,
            stdout: true,
            stderr: true
        }
    } = {}
}) => {
    if (!printEvents[type] || streamed) return;
    const {
        symbol,
        label,
        color
    } = logTypes[type];
    const pad = chalk.grey(Array(depth * cols).fill(' ').join(''));
    if ([ 'stdout', 'stderr' ].includes(type)) {
        const prefix = `${pad}${chalk[color].bold(name)} ${chalk.grey('│')} `;
        let output = printLabels[type]
            ? prefix
            : '';
        if (data != null) {
            output += `${pad}${data}`;
        }
        process[type].write(`${output}${os.EOL}`);
    } else {
        const prefix = `${pad}${symbol} ${chalk[color](label)} ${chalk.grey('-')} ${chalk.bold(name)}`;
        let output = printLabels[type]
            ? prefix
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
    }
};

module.exports = Object.keys(logTypes).reduce((r, t) => (r[t] = Log(t), r), {});
