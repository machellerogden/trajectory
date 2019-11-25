'use strict';

const chalk = require('chalk');
const { inspect } = require('util');
const logSymbols = require('log-symbols');
const { EOL } = require('os');

const logTypes = {
    succeed: {
        symbol: logSymbols.success,
        label: 'success',
        color: 'grey'
    },
    start: {
        symbol: chalk.yellow('•'),
        label: 'start',
        color: 'yellow'
    },
    info: {
        symbol: logSymbols.info,
        label: 'info',
        color: 'grey'
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
        color: 'grey'
    }
};

const fixedWidth = (width = 12, str = '', overflow = '…') => str.length >= width
    ? `${str.substring(0, width - overflow.length)}${overflow}`
    : str.padEnd(width);

const emitEntry = (k, v) => {
    const labelWidth = 16;
    return `${chalk.blue(fixedWidth(labelWidth, `${k}:`, ':'))} ${chalk.bold(fixedWidth(process.env.COLUMNS - labelWidth, JSON.stringify(v)))}${EOL}`;
};

const debugLabel = chalk.yellow('TRAJECTORY EVENT');

const debugEvent = (type, event = {}) => {
    const debugEventOutput = Object.entries(event).reduce((acc, [ k, v]) => {
        if ([ 'options' ].includes(k)) return acc;
        return acc + emitEntry(k, v);
    }, '');
    return process.stdout.write([
        EOL,
        debugLabel,
        EOL,
        emitEntry('type', type),
        debugEventOutput,
        EOL
    ].join(''));
};

const stripNamespace = name => name.includes('/')
    ? name.split('/').slice(1).join('/')
    : name;

const redactKeys = new Set([ 'password' ]);

const redact = x =>
    Array.isArray(x)                     ? x.map(redact)
    : x != null && typeof x === 'object' ? Object.entries(x).reduce((a, [k, v]) => {
                                               a[k] = redactKeys.has(k) && typeof v === 'string'
                                                   ? v.split('').fill('*').join('')
                                                   : redact(v);
                                               return a;
                                           }, {})
    : x;

const Log = type => event => {

    const {
        name,
        data,
        stateType,
        message,
        streamed = false,
        closed = false,
        depth = 0,
        options = {}
    } = event;

    const {
        cols = 2,
        quiet = false,
        gutterWidth = 12,
        debug = false,
        printStates = {
            Parallel: false,
            Task: true,
            Pass: true,
            Choice: true,
            Succeed: true,
            Fail: true,
            Wait: true
        },
        printEvents = {
            succeed: true,
            start: true,
            info: true,
            fail: true,
            error: true,
            final: false,
            complete: false,
            stdout: true,
            stderr: true
        }
    } = options;

    if (debug) return debugEvent(type, event);
    if (!printStates[stateType] || !printEvents[type] || (!printEvents.final && streamed)) return;

    const {
        symbol,
        label,
        color
    } = logTypes[type];

    const pad = chalk.grey(Array(depth * cols).fill(' ').join(''));
    const exitStatusMark = quiet                       ? ''
                         : closed && type === 'stdout' ? chalk.green.bold('✔')
                         : closed && type === 'stderr' ? chalk.red.bold('✖')
                         : '';
    let stdio;

    const prefixName = fixedWidth(gutterWidth, stripNamespace(name));

    const prefix = quiet ? '' : `${pad}${chalk[color].bold(prefixName)} ${chalk.grey('│')} `;
    let output = prefix;

    if ([ 'stdout', 'stderr' ].includes(type)) {
        if (data == null) {
            if (!quiet) output += `${pad}${exitStatusMark}${EOL}`;
        } else {
            output += `${pad}${exitStatusMark}${data}${EOL}`;
        }
        stdio = type;
    } else {
        if (data != null) {
            const serializedData = typeof data === 'string'
                ? data
                : inspect(redact(data), { colors: true, depth: null });
            output += `${pad}${serializedData.split(EOL).join(`${EOL}${prefix}`)}`;
        }
        if (message != null) output += `${EOL}${chalk.dim(message)}`;
        output += EOL;
        stdio = [ 'error', 'fail' ].includes(type) ? 'stderr' : 'stdout';
    }

    process[stdio].write(output);
};

module.exports = Object.keys(logTypes).reduce((r, t) => (r[t] = Log(t), r), {});
