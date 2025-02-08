import { PRFile, ComplexityMetrics, ComplexityReport } from "../types";

/**
 * Calculate cyclomatic complexity from code
 */
function calculateCyclomaticComplexity(code: string): number {
  const decisionPoints = [
    /if\s*\(/g,           // if statements
    /else\s+if\s*\(/g,    // else if statements
    /while\s*\(/g,        // while loops
    /for\s*\(/g,          // for loops
    /\?.+:/g,             // ternary operators
    /catch\s*\(/g,        // catch blocks
    /&&/g,                // logical AND
    /\|\|/g,              // logical OR
    /switch\s*\(/g,       // switch statements
    /case\s+.+:/g,        // case statements
  ];

  return decisionPoints.reduce((complexity, pattern) => {
    const matches = code.match(pattern) || [];
    return complexity + matches.length;
  }, 1); // Base complexity of 1
}

/**
 * Calculate metrics for a set of files
 */
function calculateMetrics(files: PRFile[]): ComplexityMetrics {
  let linesAdded = 0;
  let linesRemoved = 0;
  let cyclomaticComplexity = 0;

  files.forEach(file => {
    if (file.patch) {
      const lines = file.patch.split('\n');
      lines.forEach(line => {
        if (line.startsWith('+')) linesAdded++;
        if (line.startsWith('-')) linesRemoved++;
      });
      cyclomaticComplexity += calculateCyclomaticComplexity(file.patch);
    }
  });

  return {
    filesChanged: files.length,
    linesAdded,
    linesRemoved,
    cyclomaticComplexity,
  };
}

/**
 * Calculate complexity score from metrics
 */
function calculateScore(metrics: ComplexityMetrics): number {
  const weights = {
    files: 0.2,
    lines: 0.3,
    complexity: 0.5,
  };

  const normalizedFiles = Math.min(metrics.filesChanged / 10, 1) * 10;
  const normalizedLines = Math.min((metrics.linesAdded + metrics.linesRemoved) / 300, 1) * 10;
  const normalizedComplexity = Math.min(metrics.cyclomaticComplexity / 50, 1) * 10;

  const score = (
    normalizedFiles * weights.files +
    normalizedLines * weights.lines +
    normalizedComplexity * weights.complexity
  );

  return Math.round(score * 10) / 10;
}

/**
 * Generate recommendations based on metrics
 */
function generateRecommendations(metrics: ComplexityMetrics, score: number): string[] {
  const recommendations: string[] = [];

  if (score >= 7) {
    recommendations.push('Consider breaking this PR into smaller, more focused changes');
  }
  if (metrics.cyclomaticComplexity > 30) {
    recommendations.push('High cyclomatic complexity detected - consider simplifying the logic');
  }
  if (metrics.filesChanged > 10) {
    recommendations.push('Large number of files changed - ensure changes are cohesive');
  }
  
  recommendations.push('Ensure test coverage for all new changes');
  
  return recommendations;
}

/**
 * Analyze complexity of a PR
 */
export function analyzePRComplexity(files: PRFile[]): ComplexityReport {
  const metrics = calculateMetrics(files);
  const score = calculateScore(metrics);
  
  const level = score < 4 ? 'low' : score < 7 ? 'moderate' : 'high';
  const recommendations = generateRecommendations(metrics, score);

  return {
    score,
    metrics,
    level,
    recommendations,
  };
}

/**
 * Format complexity report as markdown
 */
export function formatComplexityReport(report: ComplexityReport): string {
  const levelEmoji = {
    low: '🟢',
    moderate: '🟡',
    high: '🔴',
  };

  const levelDescription = {
    low: 'Low complexity—should be easy to review ✅',
    moderate: 'Moderate complexity—review carefully! 🧐',
    high: 'High complexity—consider breaking this into smaller PRs! ⚠️',
  };

  return `
📊 **PR Complexity Analysis**

**Overall Score: ${report.score}/10**
${levelEmoji[report.level]} ${levelDescription[report.level]}

**Metrics:**
- 📝 Files Changed: ${report.metrics.filesChanged}
- ➕ Lines Added: ${report.metrics.linesAdded}
- ➖ Lines Removed: ${report.metrics.linesRemoved}
- 🔄 Cyclomatic Complexity: ${report.metrics.cyclomaticComplexity}

**Recommendations:**
${report.recommendations.map(rec => `- ${rec}`).join('\n')}
`;
} 