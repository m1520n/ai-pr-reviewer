const githubService = require('./github');
const aiService = require('./ai');
const commentService = require('./comment');

const prService = {
  async handlePREvent(payload) {
    try {
      console.log('Starting PR processing...');
      const { pull_request, repository, action, installation } = payload;
      
      if (!installation || !installation.id) {
        throw new Error('Missing installation ID in webhook payload');
      }

      const prNumber = pull_request.number;
      const owner = repository.owner.login;
      const repo = repository.name;
      const installationId = installation.id;

      console.log(`Processing PR #${prNumber} in ${owner}/${repo}, action: ${action}, installation: ${installationId}`);

      // Get files for analysis
      const files = await githubService.getPRFiles(owner, repo, prNumber, installationId);

      // Handle different PR events
      switch (action) {
        case 'opened':
        case 'ready_for_review':
          // Generate description and perform review
          await this.handleNewPR(owner, repo, prNumber, files, installationId);
          break;
          
        case 'draft':
          // Only generate description, no review needed
          await this.handleDraftPR(owner, repo, prNumber, files, installationId);
          break;
          
        case 'synchronize':
          // Only perform review on code changes
          await this.handlePRSync(owner, repo, prNumber, files, installationId);
          break;
      }
    } catch (error) {
      console.error('Error in handlePREvent:', error);
      throw error;
    }
  },

  async handleNewPR(owner, repo, prNumber, files, installationId) {
    console.log('Handling new PR...');
    
    // Generate and update description
    const description = await aiService.generatePRDescription(files);
    await githubService.updatePRDescription(owner, repo, prNumber, description, installationId);
    
    // Perform code review
    await this.performCodeReview(owner, repo, prNumber, files, installationId);
  },

  async handleDraftPR(owner, repo, prNumber, files, installationId) {
    console.log('Handling draft PR...');
    
    // Only generate and update description
    const description = await aiService.generatePRDescription(files);
    await githubService.updatePRDescription(owner, repo, prNumber, description, installationId);
  },

  async handlePRSync(owner, repo, prNumber, files, installationId) {
    console.log('Handling PR sync...');
    
    // Only perform code review
    await this.performCodeReview(owner, repo, prNumber, files, installationId);
  },

  async performCodeReview(owner, repo, prNumber, files, installationId) {
    // Analyze files and create review comments
    const analyses = await aiService.analyzeFiles(files);
    console.log('AI analyses completed');

    const comments = commentService.processAnalyses(analyses);
    console.log(`Generated ${comments.length} comments`);

    // Create review with files for position mapping
    if (comments.length > 0) {
      await githubService.createReview(owner, repo, prNumber, comments, files, installationId);
    } else {
      console.log('No issues found, skipping review creation');
    }
  }
};

module.exports = prService; 