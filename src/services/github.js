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

      // Process files and calculate positions
      const filteredFiles = files
        .filter(file => file.status !== 'removed')
        .map(file => {
          const positions = new Map();
          let position = 0;
          
          if (file.patch) {
            const lines = file.patch.split('\n');
            lines.forEach(line => {
              if (!line.startsWith('-')) {
                positions.set(position, {
                  line_number: parseInt(line.match(/^@@ -\d+,\d+ \+(\d+)/)?.at(1) || '1') + position,
                  content: line
                });
                position++;
              }
            });
          }

          return {
            filename: file.filename,
            patch: file.patch || 'No changes available',
            status: file.status,
            positions
          };
        });

      console.log('Filtered files:', filteredFiles.map(f => f.filename));
      return filteredFiles;
    } catch (error) {
      console.error('Error in getPRFiles:', error);
      throw error;
    }
  },

  findPositionForLine(file, lineNumber) {
    for (const [position, data] of file.positions.entries()) {
      if (data.line_number === lineNumber) {
        return position;
      }
    }
    return null;
  },

  async createReview(owner, repo, pull_number, comments, files) {
    try {
      if (comments.length === 0) {
        console.log('No comments to post, skipping review creation');
        return;
      }

      // Convert line numbers to positions
      const reviewComments = comments.map(comment => {
        const file = files.find(f => f.filename === comment.path);
        const position = file ? this.findPositionForLine(file, comment.line) : null;
        
        if (position === null) {
          console.log(`Could not find position for line ${comment.line} in ${comment.path}`);
          return null;
        }

        return {
          ...comment,
          position,
          line: undefined // Remove line as we're using position
        };
      }).filter(Boolean);

      console.log('Creating review with comments:', reviewComments);
      
      if (reviewComments.length > 0) {
        await octokit.pulls.createReview({
          owner,
          repo,
          pull_number,
          event: 'COMMENT',
          comments: reviewComments
        });
        console.log('Review created successfully');
      } else {
        console.log('No valid comments to post after position mapping');
      }
    } catch (error) {
      console.error('Error in createReview:', error);
      throw error;
    }
  }
};

module.exports = githubService; 