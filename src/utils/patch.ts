interface ExtractCodeResult {
  code: string;
  lineMapping: Map<number, number>;
}

/**
 * Extracts code from a git patch while preserving line numbers
 * @param patch - The git patch to process
 * @returns Object with code and lineMapping
 */
export const extractCodeFromPatch = (
  patch: string | undefined
): ExtractCodeResult => {
  if (!patch) {
    return {
      code: "",
      lineMapping: new Map(),
    };
  }

  const lines = patch.split("\n");
  const processedLines: string[] = [];
  const lineMapping = new Map<number, number>();
  let inHunk = false;
  let currentLine = 0;
  let outputLine = 0;

  for (const line of lines) {
    // Handle hunk headers
    if (line.startsWith("@@")) {
      inHunk = true;
      const match = line.match(/@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
      if (match) {
        currentLine = parseInt(match[1], 10) - 1;
      }
      continue;
    }

    if (!inHunk) continue;

    if (line.startsWith("-")) {
      // Skip removed lines
      continue;
    } else {
      currentLine++;
      if (line.startsWith("+")) {
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
    code: processedLines.join("\n"),
    lineMapping,
  };
};
