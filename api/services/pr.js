const githubService = require('./github');
const aiService = require('./ai');
const commentService = require('./comment');

const prService = {
  async handlePREvent(payload) {
    const { pull_request, repository } = payload;
    const prNumber = pull_request.number;
    const owner = repository.owner.login;
    const repo = repository.name;

    // Get and analyze files
    const files = await githubService.getPRFiles(owner, repo, prNumber);
    const analyses = await aiService.analyzeFiles(files);
    const comments = commentService.processAnalyses(analyses);

    // Create review
    await githubService.createReview(owner, repo, prNumber, comments);
  }
};

module.exports = prService; 