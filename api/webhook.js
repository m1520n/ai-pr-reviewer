const { Octokit } = require("@octokit/rest");
const crypto = require('crypto');
const OpenAI = require('openai');

export const maxDuration = 60;

// Initialize Octokit with GitHub token
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN
});

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Verify GitHub webhook signature
const verifyWebhookSignature = (req) => {
  const signature = req.headers['x-hub-signature-256'];
  if (!signature) {
    throw new Error('No signature found');
  }

  const hmac = crypto.createHmac('sha256', process.env.WEBHOOK_SECRET);
  const digest = 'sha256=' + hmac.update(JSON.stringify(req.body)).digest('hex');

  if (signature !== digest) {
    throw new Error('Invalid signature');
  }
};

// Function to get PR diff with commit info and positions
async function getPRDiff(owner, repo, pull_number) {
  const [{ data: files }, { data: commits }] = await Promise.all([
    octokit.pulls.listFiles({
      owner,
      repo,
      pull_number,
    }),
    octokit.pulls.listCommits({
      owner,
      repo,
      pull_number,
    })
  ]);
  
  // Process each file to get position information
  const processedFiles = files.map(file => {
    const positions = new Map();
    let position = 0;
    
    if (file.patch) {
      const lines = file.patch.split('\n');
      lines.forEach((line, index) => {
        if (!line.startsWith('-')) {
          positions.set(position, {
            line_number: line.startsWith('+') ? parseInt(line.match(/\@\@ -\d+,\d+ \+(\d+)/)?.[1] || '1') + position : null,
            content: line
          });
          position++;
        }
      });
    }
    
    return {
      filename: file.filename,
      patch: file.patch || '',
      status: file.status,
      positions
    };
  });

  return {
    files: processedFiles,
    head_sha: commits[commits.length - 1].sha
  };
}

// Function to analyze specific file content
async function analyzeFileContent(filename, content) {
  const prompt = `Review this code file and identify specific issues with line numbers:
Filename: ${filename}

${content}

For each issue found, provide:
1. The line number
2. The type of issue (bug, security, performance, style, or best practice)
3. A specific description of the problem
4. A suggested fix

Format each issue as: "LINE {line_number}: [{issue_type}] {description}"
Follow with a specific suggestion for improvement.

Important: Ensure line numbers correspond to the actual lines in the file where the issues occur.`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
    max_tokens: 1000
  });

  return completion.choices[0].message.content;
}

// Function to create review comments
async function createReviewComments(owner, repo, pull_number, head_sha, fileReviews) {
  const comments = [];
  
  for (const review of fileReviews) {
    const lines = review.analysis.split('\n');
    let currentIssue = null;
    let currentSuggestion = '';
    
    for (const line of lines) {
      const lineMatch = line.match(/^LINE (\d+): \[(.+?)\] (.+)/);
      if (lineMatch) {
        if (currentIssue && currentSuggestion) {
          // Find the correct position for the comment
          const position = findPositionForLine(review.positions, parseInt(currentIssue.line));
          if (position !== null) {
            comments.push({
              path: review.filename,
              position,
              body: `**${currentIssue.type}**: ${currentIssue.description}\n\n${currentSuggestion}`
            });
          }
        }
        
        currentIssue = {
          line: lineMatch[1],
          type: lineMatch[2],
          description: lineMatch[3]
        };
        currentSuggestion = '';
      } else if (line.startsWith('Suggestion:')) {
        currentSuggestion = line;
      }
    }
    
    // Handle the last comment
    if (currentIssue && currentSuggestion) {
      const position = findPositionForLine(review.positions, parseInt(currentIssue.line));
      if (position !== null) {
        comments.push({
          path: review.filename,
          position,
          body: `**${currentIssue.type}**: ${currentIssue.description}\n\n${currentSuggestion}`
        });
      }
    }
  }

  // Create a review with inline comments
  if (comments.length > 0) {
    await octokit.pulls.createReview({
      owner,
      repo,
      pull_number,
      commit_id: head_sha,
      body: "I've reviewed the changes and left inline comments with suggestions.",
      event: 'COMMENT',
      comments: comments
    });
  }
}

// Helper function to find the correct position for a line number
function findPositionForLine(positions, lineNumber) {
  for (const [position, data] of positions.entries()) {
    if (data.line_number === lineNumber) {
      return position;
    }
  }
  return null;
}

// Main webhook handler
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    verifyWebhookSignature(req);
    
    const event = req.headers['x-github-event'];
    const payload = req.body;

    if (event === 'pull_request') {
      if (payload.action === 'opened' || payload.action === 'synchronize') {
        const { pull_request, repository } = payload;
        
        // Get PR details
        const prNumber = pull_request.number;
        const owner = repository.owner.login;
        const repo = repository.name;

        // Get PR diff and commit info
        const { files, head_sha } = await getPRDiff(owner, repo, prNumber);

        // Analyze each file individually
        const fileReviews = await Promise.all(
          files.map(async (file) => ({
            filename: file.filename,
            analysis: await analyzeFileContent(file.filename, file.patch)
          }))
        );

        // Create inline review comments
        await createReviewComments(owner, repo, prNumber, head_sha, fileReviews);

        // Create a summary comment
        const summary = fileReviews
          .map(review => `## ${review.filename}\n${review.analysis}`)
          .join('\n\n');

        await octokit.issues.createComment({
          owner,
          repo,
          issue_number: prNumber,
          body: `# PR Review Summary\n\n${summary}\n\n> Note: Detailed inline comments have been added to the relevant code sections.`
        });
      }
    }

    res.status(200).json({ message: 'Webhook processed successfully' });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ error: error.message });
  }
}
