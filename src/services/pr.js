const githubService = require('./github');
const aiService = require('./ai');
const commentService = require('./comment');

const prService = {
  async handlePREvent(payload) {
    try {
      console.log('Starting PR review...');
      const { pull_request, repository } = payload;
      const prNumber = pull_request.number;
      const owner = repository.owner.login;
      const repo = repository.name;

      console.log(`Processing PR #${prNumber} in ${owner}/${repo}`);

      // Get and analyze files
      const files = await githubService.getPRFiles(owner, repo, prNumber);
      console.log(`Found ${files.length} files to review:`, files.map(f => f.filename));

      const analyses = await aiService.analyzeFiles(files);
      console.log('AI analyses completed:', analyses);

      const comments = commentService.processAnalyses(analyses);
      console.log(`Generated ${comments.length} comments:`, comments);

      // Create review
      await githubService.createReview(owner, repo, prNumber, comments);
      console.log('Review posted successfully');
    } catch (error) {
      console.error('Error in handlePREvent:', error);
      throw error;
    }
  }
};

module.exports = prService; 