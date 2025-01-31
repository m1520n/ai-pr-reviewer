const commentService = {
  parseAnalysisToComments(analysis) {
    return analysis.analysis
      .split('\n')
      .filter(line => line.trim() && line.startsWith('LINE'))
      .map(line => {
        const match = line.match(/^LINE (\d+): \[(.+?)\] (.+)/);
        if (match) {
          return {
            path: analysis.filename,
            line: parseInt(match[1]),
            body: `**${match[2]}**: ${match[3]}`
          };
        }
        return null;
      })
      .filter(Boolean);
  },

  processAnalyses(analyses) {
    return analyses.flatMap(analysis => this.parseAnalysisToComments(analysis));
  }
};

module.exports = commentService; 