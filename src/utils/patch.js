/**
 * Utility functions for handling git patches
 */
const patchUtils = {
  /**
   * Extracts only the added/modified code from a git patch
   * Removes diff markers and metadata to reduce token usage
   */
  extractCodeFromPatch(patch) {
    if (!patch) return '';

    const lines = patch.split('\n');
    const codeLines = lines.filter(line => {
      // Keep only added lines, skip diff metadata
      return line.startsWith('+') && 
             !line.startsWith('+++') &&
             line.length > 1;
    });

    // Remove the '+' prefix from lines
    return codeLines.map(line => line.slice(1)).join('\n');
  }
};

module.exports = patchUtils; 