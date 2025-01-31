const { Octokit } = require("@octokit/rest");

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN
});

const githubService = {
  async getPRFiles(owner, repo, pull_number) {
    try {
      console.log(`Fetching files for PR #${pull_number}...`);
      const { data: files } = await octokit.pulls.listFiles({
        owner,
        repo,
        pull_number,
      });

      const filteredFiles = files
        .filter(file => file.patch && file.patch.length < 1000)
        .map(file => ({
          filename: file.filename,
          patch: file.patch,
          status: file.status
        }))
        .slice(0, 5);

      console.log(`Found ${files.length} total files, filtered to ${filteredFiles.length}`);
      return filteredFiles;
    } catch (error) {
      console.error('Error in getPRFiles:', error);
      throw error;
    }
  },

  async createReview(owner, repo, pull_number, comments) {
    try {
      if (comments.length === 0) {
        console.log('No comments to post, skipping review creation');
        return;
      }

      console.log('Creating review with comments:', comments);
      await octokit.pulls.createReview({
        owner,
        repo,
        pull_number,
        event: 'COMMENT',
        comments
      });
      console.log('Review created successfully');
    } catch (error) {
      console.error('Error in createReview:', error);
      throw error;
    }
  }
};

module.exports = githubService; 