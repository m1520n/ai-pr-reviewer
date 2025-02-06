import { PRFile, FileStatus } from '../types/index.js';

interface ExtractCodeResult {
  code: string;
  lineMapping: Map<number, number>;
}

/**
 * Process a file patch to extract code and line mappings
 * @param filename - The name of the file
 * @param patch - The patch content
 * @param status - The status of the file
 * @returns The processed PRFile object
 */
export function processPatch(
  filename: string,
  patch: string | undefined,
  status: FileStatus,
): PRFile {
  if (status === 'removed') {
    throw new Error('Cannot process removed files');
  }

  // For new files, each line number is its own position
  if (status === 'added') {
    const positions = new Map<number, number>();
    const lines = (patch || '').split('\n');
    let lineNumber = 1;

    lines.forEach((line, index) => {
      if (line.startsWith('+') || !line.startsWith('-')) {
        positions.set(lineNumber, index);
        lineNumber++;
      }
    });

    return {
      filename,
      patch: patch || 'No changes available',
      status,
      positions,
      raw_patch: patch,
    };
  }

  // For modified files, use the hunk-based approach
  const positions = new Map<number, number>();
  let currentLine = 0;

  if (patch) {
    const hunks = patch.split('\n');
    let position = 0;
    let inHunk = false;

    hunks.forEach((line) => {
      if (line.startsWith('@@')) {
        const match = line.match(/@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
        if (match) {
          currentLine = parseInt(match[1], 10);
          inHunk = true;
        }
      } else if (inHunk) {
        if (!line.startsWith('-')) {
          positions.set(currentLine, position);
          currentLine++;
        }
        position++;
      }
    });
  }

  return {
    filename,
    patch: patch || 'No changes available',
    status,
    positions,
    raw_patch: patch,
  };
}

/**
 * Extracts code from a git patch while preserving line numbers
 * @param patch - The git patch to process
 * @returns Object with code and lineMapping
 */
export function extractCodeFromPatch(patch: string | undefined): ExtractCodeResult {
  if (!patch) {
    return {
      code: '',
      lineMapping: new Map(),
    };
  }

  const lines = patch.split('\n');
  const processedLines: string[] = [];
  const lineMapping = new Map<number, number>();
  let inHunk = false;
  let currentLine = 0;
  let outputLine = 0;

  for (const line of lines) {
    // Handle hunk headers
    if (line.startsWith('@@')) {
      inHunk = true;
      const match = line.match(/@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
      if (match) {
        currentLine = parseInt(match[1], 10) - 1;
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
    lineMapping,
  };
}

/**
 * Find the position for a specific line number in a file
 * @param file - The PRFile object containing the file information
 * @param lineNumber - The line number to find the position for
 * @returns The position of the line number in the file, or null if not found
 */
export function findPositionForLine(file: PRFile, lineNumber: number): number | null {
  const position = file.positions.get(lineNumber);
  if (position !== undefined) {
    console.log(`Found position ${position} for line ${lineNumber} in ${file.filename}`);
    return position;
  }
  console.log(`No position found for line ${lineNumber} in ${file.filename}`);
  console.log('Available positions:', Array.from(file.positions.entries()));
  return null;
}
