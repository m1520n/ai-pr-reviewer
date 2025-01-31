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
          let currentLine = 0;
          
          if (file.patch) {
            const hunks = file.patch.split(/^@@/m);
            
            // Process each hunk
            hunks.forEach(hunk => {
              if (!hunk.trim()) return;
              
              // Parse hunk header
              const headerMatch = hunk.match(/^[ -](\d+),\d+ \+(\d+),\d+/);
              if (headerMatch) {
                currentLine = parseInt(headerMatch[2]);
                
                // Process hunk lines
                const lines = hunk.split('\n').slice(1);
                let position = 0;
                
                lines.forEach(line => {
                  if (line.startsWith('+') || line.startsWith(' ')) {
                    positions.set(currentLine, position);
                    currentLine++;
                  }
                  if (!line.startsWith('-')) {
                    position++;
                  }
                });
              }
            });
          }

          return {
            filename: file.filename,
            patch: file.patch || 'No changes available',
            status: file.status,
            positions,
            raw_patch: file.patch // Keep raw patch for debugging
          };
        });

      console.log('Processed files:', filteredFiles.map(f => ({
        filename: f.filename,
        positions: Array.from(f.positions.entries())
      })));
      
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
          console.log('File patch:', file.raw_patch);
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