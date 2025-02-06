import { AnalysisResult, ReviewComment } from "../types/index.js";

/**
 * Parse an analysis into comments
 * @param analysis - The analysis to parse
 * @returns The parsed comments
 */
export function parseAnalysisToComments(
  analysis: AnalysisResult
): ReviewComment[] {
  try {
    // Split the analysis into lines and process each line
    const comments = analysis.analysis
      .split("\n")
      .filter((line) => line.trim()) // Remove empty lines
      .map((line) => {
        // Remove quotes from the line
        const cleanLine = line.replace(/^"|"$/g, "");

        // Parse the line into components
        const match = cleanLine.match(/^LINE (\d+): \[(.+?)\] (.+)$/);
        if (match) {
          return {
            path: analysis.filename,
            line: parseInt(match[1], 10),
            body: `**${match[2]}**: ${match[3]}`,
          };
        }
        return null;
      })
      .filter((comment): comment is ReviewComment => comment !== null);

    return comments;
  } catch (error) {
    console.error("Error parsing analysis:", error);
    return [];
  }
}

/**
 * Process a list of analyses into comments
 * @param analyses - The analyses to process
 * @returns The processed comments
 */
export function processAnalyses(analyses: AnalysisResult[]): ReviewComment[] {
  try {
    return analyses.flatMap((analysis) =>
      parseAnalysisToComments(analysis)
    );
  } catch (error) {
    console.error("Error processing analyses:", error);
    return [];
  }
}
