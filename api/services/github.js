const { Octokit } = require("@octokit/rest");

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN
});

const githubService = {
  async getPRFiles(owner, repo, pull_number) {
    const { data: files } = await octokit.pulls.listFiles({
      owner,
      repo,
      pull_number,
    });

    return files
      .filter(file => file.patch && file.patch.length < 1000)
      .map(file => ({
        filename: file.filename,
        patch: file.patch,
        status: file.status
      }))
      .slice(0, 5);
  },

  async createReview(owner, repo, pull_number, comments) {
    if (comments.length === 0) return;

    await octokit.pulls.createReview({
      owner,
      repo,
      pull_number,
      event: 'COMMENT',
      comments
    });
  }
};

module.exports = githubService; 