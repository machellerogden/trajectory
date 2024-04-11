import chalk from 'chalk';
import { inspect } from 'node:util';

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

function printLog(depth, colors, labels, ...args) {
    const [ colorA, colorB, colorC ] = colors;
    const [ labelA, labelB, labelC ] = labels;
    depth = depth ?? 0;
    const gutter = '│'.repeat(depth);
    return [
        Label(colorA, labelA, colAWidth, gutter),
        Label(colorB, labelB, colBWidth),
        Label(colorC, labelC, colCWidth),
        args.map(arg => ' ' + inspect(arg)).join('').replace(/\n/g, '\n' + chalk.dim(gutter) + ' '.repeat(colsWidth + 4 - depth))
    ].join('');
}

const print = (depth, colors, labels, ...args) =>
    printLog(depth, colors, labels, ...args);

const log = (depth, colors, labels, ...args) =>
    console.log(print(depth, colors, labels, ...args));

export function DefaultLogger(context) {
    return (event, label, ...args) => {
        if (event == 'StateInfo') {
            return log(
                context.depth,
                [chalk.yellow,     chalk.dim,          chalk.blue],
                [context.stateKey, context.state.Type, label],
                ...args
            );
        } else if (event == 'StateSucceed') {
            return log(
                context.depth,
                [chalk.yellow,     chalk.dim,          chalk.green],
                [context.stateKey, context.state.Type, label],
                ...args
            );
        } else if (event == 'StateFail') {
            return log(
                context.depth,
                [chalk.yellow,     chalk.dim,          chalk.red],
                [context.stateKey, context.state.Type, label],
                ...args
            );
        } else if (event == 'MachineStart') {
            return log(
                context.depth,
                [chalk.dim, chalk.dim, chalk.blue],
                ['+', 'Machine', 'MachineStarted'],
                label,
                ...args
            );
        } else if (event == 'MachineSucceed') {
            return log(
                context.depth,
                [chalk.dim, chalk.dim, chalk.green],
                ['-', 'Machine', 'MachineSucceeded'],
                label,
                ...args
            );
        } else if (event == 'MachineFail') {
            return log(
                context.depth,
                [chalk.dim, chalk.dim, chalk.red],
                ['-', 'Machine', 'MachineFailed'],
                label,
                ...args
            );
        }
    };
}
