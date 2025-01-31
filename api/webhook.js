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

// Function to get PR diff and commit SHA
async function getPRDetails(owner, repo, pull_number) {
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

  return {
    files,
    head_sha: commits[commits.length - 1].sha
  };
}

// Function to analyze a single file
async function analyzeFile(filename, patch) {
  const prompt = `Review this code file and provide specific feedback:
Filename: ${filename}

${patch}

Analyze the code for:
1. Bugs and potential issues
2. Security concerns
3. Performance problems
4. Code style issues
5. Best practices violations

For each issue, specify:
1. The exact line number in the diff
2. A clear description of the problem
3. A specific suggestion for improvement

Format each issue as a separate review comment that can be placed on the specific line.`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
    max_tokens: 1000
  });

  return completion.choices[0].message.content;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    verifyWebhookSignature(req);
    
    const event = req.headers['x-github-event'];
    const payload = req.body;

    if (event === 'pull_request' && 
        (payload.action === 'opened' || payload.action === 'synchronize')) {
      const { pull_request, repository } = payload;
      const prNumber = pull_request.number;
      const owner = repository.owner.login;
      const repo = repository.name;

      // Get PR details
      const { files, head_sha } = await getPRDetails(owner, repo, prNumber);

      // Create review comments
      const comments = [];
      
      // Analyze each file and create review comments
      for (const file of files) {
        if (file.patch) {
          const analysis = await analyzeFile(file.filename, file.patch);
          
          // Split analysis into separate comments
          const lines = analysis.split('\n');
          let currentComment = '';
          let lineNumber = null;
          
          for (const line of lines) {
            if (line.trim().startsWith('LINE')) {
              // If we have a previous comment ready, add it
              if (currentComment && lineNumber) {
                comments.push({
                  path: file.filename,
                  line: lineNumber,
                  body: currentComment.trim()
                });
              }
              
              // Start new comment
              lineNumber = parseInt(line.match(/LINE (\d+)/)[1]);
              currentComment = line + '\n';
            } else if (line.trim()) {
              currentComment += line + '\n';
            }
          }
          
          // Add the last comment if exists
          if (currentComment && lineNumber) {
            comments.push({
              path: file.filename,
              line: lineNumber,
              body: currentComment.trim()
            });
          }
        }
      }

      // Create the review with inline comments
      if (comments.length > 0) {
        await octokit.pulls.createReview({
          owner,
          repo,
          pull_number: prNumber,
          commit_id: head_sha,
          event: 'COMMENT',
          comments: comments,
          body: "I've reviewed the changes and left inline comments with suggestions."
        });
      }
    }

    res.status(200).json({ message: 'Webhook processed successfully' });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ error: error.message });
  }
}
