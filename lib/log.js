import chalk from 'chalk';
import { inspect } from 'node:util';
import { EVENT } from './constants.js';

const [ colAWidth, colBWidth, colCWidth ] = [ 20, 11, 21 ];
const colsWidth = colAWidth + colBWidth + colCWidth;

const Gutter = (depth) => '│'.repeat(depth);

function Label(colorFn, label, colWidth, prefix) {
    colWidth = colWidth ?? 16;
    prefix = prefix ?? '';
    const offset = prefix.length;
    const width = label.length + 3 + offset;
    let formatted = '';
    if (width > colWidth) {
        formatted = `[${label.slice(0, colWidth - (3 + offset)) + '…'}]`;
    } else {
        formatted = `[${label}]`.padEnd(colWidth - offset);
    }
    formatted = chalk.dim(prefix) + colorFn((formatted)) + ' ';
    return formatted;
}

function print(context, colors, labels, ...args) {
    const [ colorA, colorB, colorC ] = colors;
    const [ labelA, labelB, labelC ] = labels;
    const depth = context.depth ?? 0;
    const gutter = '│'.repeat(depth);
    const colA = Label(colorA, labelA, colAWidth, gutter);
    const colB = Label(colorB, labelB, colBWidth)
    const colC = Label(colorC, labelC, colCWidth);
    const maxLen = 120 - depth - colsWidth - 4;
    const rest = args.map(arg => {
        let str = inspect(arg);
        const lines = str.split('\n');
        const lineCount = lines.length;
        if (lineCount > 4) {
            str = lines.slice(0, 4).join('\n') + '\n' + '…';
        }
        if (str.length > maxLen) {
            str = str.slice(0, maxLen - 3) + '…';
        }
        return str;
    });

    return [
        colA,
        colB,
        colC,
        rest.map(arg => ' ' + arg).join('').replace(/\n/g, '\n' + chalk.dim(gutter) + ' '.repeat(colsWidth + 4 - depth))
    ].join('');
}

const log = (...args) => console.log(print(...args));

export function DefaultLogger(context) {
    return (event, label, ...args) => {
        if (event == EVENT.StateInfo) {
            return log(
                context,
                [chalk.yellow,     chalk.dim,          chalk.blue],
                [context.stateKey, context.state.Type, label],
                ...args
            );
        } else if (event == EVENT.StateSucceed) {
            return log(
                context,
                [chalk.yellow,     chalk.dim,          chalk.green],
                [context.stateKey, context.state.Type, label],
                ...args
            );
        } else if (event == EVENT.StateFail) {
            return log(
                context,
                [chalk.yellow,     chalk.dim,          chalk.red],
                [context.stateKey, context.state.Type, label],
                ...args
            );
        } else if (event == EVENT.MachineStart) {
            const io = label;
            return log(
                context,
                [chalk.dim, chalk.dim, chalk.blue],
                ['+', 'Machine', 'MachineStarted'],
                io
            );
        } else if (event == EVENT.MachineSucceed) {
            const io = label;
            return log(
                context,
                [chalk.dim, chalk.dim, chalk.green],
                ['-', 'Machine', 'MachineSucceeded'],
                io
            );
        } else if (event == EVENT.MachineFail) {
            const io = label;
            return log(
                context,
                [chalk.dim, chalk.dim, chalk.red],
                ['-', 'Machine', 'MachineFailed'],
                io
            );
        }
    };
}
