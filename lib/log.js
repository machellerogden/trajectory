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

function printLog(depth, colors, labels, ...rest) {
    const [ colorA, colorB, colorC ] = colors;
    const [ labelA, labelB, labelC ] = labels;
    depth = depth ?? 0;
    const gutter = '│'.repeat(depth);
    return [
        Label(colorA, labelA, colAWidth, gutter),
        Label(colorB, labelB, colBWidth),
        Label(colorC, labelC, colCWidth),
        rest.map(arg => ' ' + inspect(arg)).join('').replace(/\n/g, '\n' + chalk.dim(gutter) + ' '.repeat(colsWidth + 4 - depth))
    ].join('');
}

export const print = (depth, colors, labels, ...rest) =>
    printLog(depth, colors, labels, ...rest);

export const log = (depth, colors, labels, ...rest) =>
    console.log(print(depth, colors, labels, ...rest));

export const logStateInfo = (context, io, ...rest) =>
    log(context.depth,
        [chalk.yellow, chalk.dim, chalk.blue],
        [context.stateKey, context.state.Type, io],
        ...rest);

export const logStateSucceed = (context, io, ...rest) =>
    log(context.depth,
        [chalk.yellow, chalk.dim, chalk.green],
        [context.stateKey, context.state.Type, io],
        ...rest);

export const logStateFail = (context, io, ...rest) =>
    log(context.depth,
        [chalk.yellow, chalk.dim, chalk.red],
        [context.stateKey, context.state.Type, io],
        ...rest);

export const logMachineInfo = (context, key, io, ...rest) =>
    log(context.depth,
        [chalk.dim, chalk.dim, chalk.blue],
        [key, 'Machine', io],
        ...rest);

export const logMachineSucceed = (context, key, io, ...rest) =>
    log(context.depth,
        [chalk.dim, chalk.dim, chalk.green],
        [key, 'Machine', io],
        ...rest);

export const logMachineFail = (context, key, io, ...rest) =>
    log(context.depth,
        [chalk.dim, chalk.dim, chalk.red],
        [key, 'Machine', io],
        ...rest);
