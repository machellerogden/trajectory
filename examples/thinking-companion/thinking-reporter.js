import chalk from 'chalk';
import { EVENT } from '../../lib/constants.js';
import { formatSignalsForDisplay } from './signal-classes.js';

// Configuration for each state's display properties
const STATE_CONFIG = {
    AggregateSignals: {
        icon: '🧠',
        color: chalk.blue,
        label: 'Signal Analysis',
        format: 'signals'
    },
    OuterVoiceProposal: {
        icon: '🗣️',
        color: chalk.green,
        label: 'Outer Voice Proposes',
        format: 'dialogue'
    },
    InnerVoiceResponse: {
        icon: '💭',
        color: chalk.magenta,
        label: 'Inner Voice Responds',
        format: 'dialogue',
        showConvergence: true
    },
    ReviseWithInnerFeedback: {
        icon: '🔄',
        color: chalk.cyan,
        label: 'Outer Voice Revises',
        format: 'dialogue'
    },
    GenerateFinalResponse: {
        icon: '✨',
        color: chalk.bold.green,
        label: 'Final Response',
        format: 'final'
    }
};

/**
 * Unified text formatter with configurable styles
 */
function formatText(content, style = 'dialogue') {
    if (!content) return '';
    
    const styles = {
        inline: content => content,
        dialogue: content => formatWithIndent(content, '   ', 80),
        final: content => formatWithIndent(content, '│ ', 76),
        signals: content => formatSignalsDisplay(content)
    };
    
    return styles[style] ? styles[style](content) : content;
}

/**
 * Format text with consistent indentation and word wrapping
 */
function formatWithIndent(content, indent, maxWidth) {
    return content
        .split(/\n\s*\n/)
        .map(paragraph => wrapText(paragraph.replace(/\s+/g, ' ').trim(), maxWidth, indent))
        .join(`\n${indent}\n`);
}

/**
 * Wrap text at word boundaries with given indent
 */
function wrapText(text, maxWidth, indent) {
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';
    
    for (const word of words) {
        const lineLength = currentLine.length + word.length + 1;
        
        if (lineLength > maxWidth - indent.length && currentLine) {
            lines.push(indent + currentLine);
            currentLine = word;
        } else {
            currentLine = currentLine ? `${currentLine} ${word}` : word;
        }
    }
    
    if (currentLine) {
        lines.push(indent + currentLine);
    }
    
    return lines.join('\n');
}

/**
 * Format signals object for display
 */
function formatSignalsDisplay(signalsResult) {
    if (!signalsResult || typeof signalsResult !== 'object') {
        return '   No signals detected';
    }
    
    const { signals, errors, valid } = signalsResult;
    
    if (!signals) {
        return '   Error: Invalid signals format';
    }
    
    const lines = [];
    
    // Show detected signals by class
    for (const [className, detectedSignals] of Object.entries(signals)) {
        if (detectedSignals.length > 0) {
            const signalList = detectedSignals.join(', ');
            lines.push(`   ${className}: ${chalk.yellow(signalList)}`);
        }
    }
    
    if (lines.length === 0) {
        lines.push('   No signals detected');
    }
    
    // Show errors if any
    if (errors && errors.length > 0) {
        lines.push('');
        lines.push(chalk.red('   Errors:'));
        errors.forEach(error => {
            lines.push(chalk.red(`   • ${error}`));
        });
    }
    
    return lines.join('\n');
}

/**
 * Clean, configurable thinking companion logger
 */
export function thinkingCompanionLogger(context, event, label, ...args) {
    const { stateKey, depth = 0 } = context;
    
    // Only show user input for main machine (depth 0), not parallel branches
    if (event === EVENT.MachineStart && depth === 0) {
        const userInput = label?.user_input;
        if (userInput) {
            console.log(chalk.bold('\n👤 User:'), userInput);
            console.log(chalk.dim('━'.repeat(70)));
        }
    }
    
    // Handle successful state completions
    if (event === EVENT.StateSucceed && label === 'HandlerSucceeded') {
        const config = STATE_CONFIG[stateKey];
        if (!config) return;
        
        // Special handling for AggregateSignals state (no content property)
        if (stateKey === 'AggregateSignals') {
            const signalsResult = args[0];
            if (!signalsResult) return;
            
            // Display state header
            console.log(config.color(`\n${config.icon} ${config.label}:`));
            console.log(chalk.dim('─'.repeat(32)));
            
            // Format and display signals
            console.log(formatText(signalsResult, config.format));
            return;
        }
        
        const content = args[0]?.content;
        if (!content) return;
        
        // Display state header
        console.log(config.color(`\n${config.icon} ${config.label}:`));
        if (config.format !== 'inline') {
            console.log(chalk.dim('─'.repeat(32)));
        }
        
        // Format and display content
        if (config.format === 'inline') {
            console.log(config.color(chalk.bold(content)));
        } else {
            console.log(formatText(content, config.format));
        }
        
        // Show convergence status for inner voice
        if (config.showConvergence) {
            const isAgreement = content.trim().toLowerCase() === 'agree';
            const status = isAgreement 
                ? chalk.green('   ✅ Voices converged!')
                : chalk.yellow('   🔄 Requesting revision...');
            console.log(status);
        }
    }
    
    // Show turn counter
    if (event === EVENT.StateSucceed && label === 'HandlerSucceeded' && 
        stateKey === 'IncrementTurnCounter') {
        const turnCount = args[0]?.turn_count || 0;
        console.log(chalk.dim(`   🔢 Turn ${turnCount}`));
    }
    
    // Show convergence check
    if (event === EVENT.StateInfo && label === 'StateEntered' && 
        stateKey === 'CheckConvergence') {
        console.log(chalk.dim('\n🤔 Checking if voices agree...'));
    }
    
    // Only show completion for main machine (depth 0), not parallel branches  
    if (event === EVENT.MachineSucceed && depth === 0) {
        console.log(chalk.dim('\n' + '━'.repeat(70)));
        console.log(chalk.green('🧠 Thinking process complete!'));
    }
    
    // Show errors
    if (event === EVENT.StateFail || event === EVENT.MachineFail) {
        console.log(chalk.red(`\n❌ Error in ${stateKey}:`), label, ...args);
    }
}