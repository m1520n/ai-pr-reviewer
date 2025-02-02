const { Octokit } = require("@octokit/rest");

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN
});

const githubService = {
  async getPRFiles(owner, repo, pull_number) {
    try {
      const { data: files } = await octokit.pulls.listFiles({
        owner,
        repo,
        pull_number,
      });

      // Process files and calculate positions
      const filteredFiles = files
        .filter(file => file.status !== 'removed')
        .map(file => {
          // For new files, each line number is its own position
          if (file.status === 'added') {
            const positions = new Map();
            const lines = (file.patch || '').split('\n');
            let lineNumber = 1;
            
            lines.forEach((line, index) => {
              if (line.startsWith('+') || !line.startsWith('-')) {
                positions.set(lineNumber, index);
                lineNumber++;
              }
            });

            return {
              filename: file.filename,
              patch: file.patch || 'No changes available',
              status: file.status,
              positions,
              raw_patch: file.patch
            };
          }

          // For modified files, use the hunk-based approach
          const positions = new Map();
          let currentLine = 0;
          
          if (file.patch) {
            const hunks = file.patch.split('\n');
            let position = 0;
            let inHunk = false;
            
            hunks.forEach(line => {
              if (line.startsWith('@@')) {
                const match = line.match(/@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
                if (match) {
                  currentLine = parseInt(match[1]);
                  inHunk = true;
                }
              } else if (inHunk) {
                if (!line.startsWith('-')) {
                  positions.set(currentLine, position);
                  currentLine++;
                }
                position++;
              }
            });
          }

          return {
            filename: file.filename,
            patch: file.patch || 'No changes available',
            status: file.status,
            positions,
            raw_patch: file.patch
          };
        });
      
      return filteredFiles;
    } catch (error) {
      console.error('Error in getPRFiles:', error);
      throw error;
    }
  },

  findPositionForLine(file, lineNumber) {
    const position = file.positions.get(lineNumber);
    if (position !== undefined) {
      console.log(`Found position ${position} for line ${lineNumber} in ${file.filename}`);
      return position;
    }
    console.log(`No position found for line ${lineNumber} in ${file.filename}`);
    console.log('Available positions:', Array.from(file.positions.entries()));
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
        if (!file) {
          console.log(`File not found: ${comment.path}`);
          return null;
        }

        const position = this.findPositionForLine(file, comment.line);
        if (position === null) {
          console.log(`Could not find position for line ${comment.line} in ${comment.path}`);
          return null;
        }

        return {
          path: comment.path,
          position,
          body: comment.body
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