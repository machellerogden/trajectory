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
        label: 'final',
        color: 'grey'
    },
    complete: {
        symbol: logSymbols.info,
        label: 'complete',
        color: 'grey'
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
    closed,
    depth = 0,
    options: {
        cols = 2,
        gutterWidth = 12,
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
    const exitStatusMark = closed && type === 'stdout' ? chalk.green.bold('✔')
                         : closed && type === 'stderr' ? chalk.red.bold('✖')
                         : '';
    let stdio;

    const prefixName = name.length >= gutterWidth
        ? `${name.substring(0, gutterWidth - 1)}…`
        : name.padEnd(gutterWidth);

    const prefix = `${pad}${chalk[color].bold(prefixName)} ${chalk.grey('│')} `;
    let output = prefix;

    if ([ 'stdout', 'stderr' ].includes(type)) {
        output += `${pad}${exitStatusMark}${data || ''}${os.EOL}`;
        stdio = type;
    } else {
        if (data != null) {
            const serializedData = typeof data === 'string'
                ? data
                : inspect(data, { colors: true, depth: null });
            output += `${pad}${serializedData.split(os.EOL).join(`${os.EOL}${pad}`)}`;
        }
        if (message != null) output += `${os.EOL}${chalk.dim(message)}`;
        output += os.EOL;
        stdio = [ 'error', 'fail' ].includes(type) ? 'stderr' : 'stdout';
    }

    process[stdio].write(output);
};

module.exports = Object.keys(logTypes).reduce((r, t) => (r[t] = Log(t), r), {});
