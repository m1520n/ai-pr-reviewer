const commentService = {
  parseAnalysisToComments(analysis) {
    try {
      console.log('Parsing analysis:', analysis);
      
      // Split the analysis into lines and process each line
      const comments = analysis.analysis
        .split('\n')
        .filter(line => line.trim())  // Remove empty lines
        .map(line => {
          // Remove quotes from the line
          const cleanLine = line.replace(/^"|"$/g, '');
          
          // Parse the line into components
          const match = cleanLine.match(/^LINE (\d+): \[(.+?)\] (.+)$/);
          if (match) {
            return {
              path: analysis.filename,
              line: parseInt(match[1]),
              body: `**${match[2]}**: ${match[3]}`
            };
          }
          return null;
        })
        .filter(Boolean);  // Remove null entries

      console.log(`Parsed ${comments.length} comments for ${analysis.filename}:`, comments);
      return comments;
    } catch (error) {
      console.error('Error parsing analysis:', error);
      return [];
    }
  },

  processAnalyses(analyses) {
    try {
      console.log('Processing analyses:', analyses);
      const allComments = analyses.flatMap(analysis => this.parseAnalysisToComments(analysis));
      console.log('All processed comments:', allComments);
      return allComments;
    } catch (error) {
      console.error('Error processing analyses:', error);
      return [];
    }
  }
};

module.exports = commentService; 