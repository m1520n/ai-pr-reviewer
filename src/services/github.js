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

      // Log raw file data for debugging
      console.log('Raw files:', files.map(f => ({
        filename: f.filename,
        status: f.status,
        has_patch: !!f.patch,
        patch_length: f.patch?.length || 0
      })));

      // Less restrictive filtering
      const filteredFiles = files
        .filter(file => {
          // Accept any file that has changes and isn't deleted
          const isValid = file.status !== 'removed';
          if (!isValid) {
            console.log(`Skipping file ${file.filename}: removed file`);
          }
          return isValid;
        })
        .map(file => ({
          filename: file.filename,
          patch: file.patch || 'No changes available',
          status: file.status
        }));

      console.log('Filtered files:', filteredFiles.map(f => f.filename));
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