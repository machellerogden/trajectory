export function tokenizeArgs(rawArgs) {
    const tokens = [];
    let currentToken = '';
    let depth = 0;
    let inString = false;
    let stringChar = null;

    for (let i = 0; i < rawArgs.length; i++) {
        const char = rawArgs[i];

        // Handle strings (single or double quotes)
        if ((char === '"' || char === "'") && !inString) {
            inString = true;
            stringChar = char;
        } else if (char === stringChar && inString) {
            inString = false;
            stringChar = null;
        }

        // Handle parentheses for nested functions
        if (char === '(' && !inString) depth++;
        if (char === ')' && !inString) depth--;

        // Split by commas only when not in a nested function or string
        if (char === ',' && depth === 0 && !inString) {
            tokens.push(currentToken.trim());
            currentToken = '';
        } else {
            currentToken += char;
        }
    }

    // Add the last token
    if (currentToken.trim()) {
        tokens.push(currentToken.trim());
    }

    return tokens;
}
