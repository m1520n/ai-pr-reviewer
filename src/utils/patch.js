/**
 * Utility functions for handling git patches
 */
const patchUtils = {
  /**
   * Extracts code from a git patch while preserving line numbers
   * @returns {Object} with code and lineMapping
   */
  extractCodeFromPatch(patch) {
    if (!patch) return '';

    const lines = patch.split('\n');
    let processedLines = [];
    let lineMapping = new Map();
    let inHunk = false;
    let currentLine = 0;
    let outputLine = 0;

    for (const line of lines) {
      // Handle hunk headers
      if (line.startsWith('@@')) {
        inHunk = true;
        const match = line.match(/@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
        if (match) {
          currentLine = parseInt(match[1]) - 1;
        }
        continue;
      }

      if (!inHunk) continue;

      if (line.startsWith('-')) {
        // Skip removed lines
        continue;
      } else {
        currentLine++;
        if (line.startsWith('+')) {
          // For added/modified lines
          processedLines.push(line.slice(1));
          lineMapping.set(outputLine, currentLine);
          outputLine++;
        } else {
          // For context lines
          processedLines.push(line);
          lineMapping.set(outputLine, currentLine);
          outputLine++;
        }
      }
    }

    return {
      code: processedLines.join('\n'),
      lineMapping
    };
  }
};

module.exports = patchUtils;