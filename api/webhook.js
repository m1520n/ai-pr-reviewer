const { Octokit } = require("@octokit/rest");
const crypto = require('crypto');
const OpenAI = require('openai');

export const maxDuration = 60;

// Initialize clients
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN
});

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

// Function to get PR details
async function getPRDetails(owner, repo, pull_number) {
  const [{ data: files }, { data: commits }, { data: pr }] = await Promise.all([
    octokit.pulls.listFiles({
      owner,
      repo,
      pull_number,
    }),
    octokit.pulls.listCommits({
      owner,
      repo,
      pull_number,
    }),
    octokit.pulls.get({
      owner,
      repo,
      pull_number,
    })
  ]);

  return {
    files,
    head_sha: commits[commits.length - 1].sha,
    pr
  };
}

// Function to analyze the entire PR
async function analyzePR(pr, files) {
  const prompt = `Review this pull request holistically:

Title: ${pr.title}
Description: ${pr.body || 'No description provided'}

Changed files:
${files.map(file => `
${file.filename}
\`\`\`
${file.patch || 'No diff available'}
\`\`\`
`).join('\n')}

Provide:
1. Overall assessment of the changes
2. Cross-file impacts and potential issues
3. General suggestions for improvement
4. Any architectural concerns

Format your response in markdown with clear sections.`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
    max_tokens: 1500
  });

  return completion.choices[0].message.content;
}

// Function to analyze a single file
async function analyzeFile(filename, patch) {
  const prompt = `Review this file and identify specific issues:
Filename: ${filename}

\`\`\`
${patch}
\`\`\`

For each issue found:
1. Identify the specific line number in the diff
2. Classify the issue type (bug, security, performance, style, best practice)
3. Explain the problem
4. Provide a concrete suggestion for improvement

Format each issue as:
LINE <number>: [<type>] <description>
Suggestion: <specific improvement>`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
    max_tokens: 1000
  });

  return completion.choices[0].message.content;
}

// Function to create review comments
async function createReview(owner, repo, pull_number, head_sha, fileAnalyses, overallAnalysis) {
  const comments = [];

  // Process each file's analysis
  for (const analysis of fileAnalyses) {
    const lines = analysis.content.split('\n');
    let currentIssue = null;
    let currentSuggestion = '';

    for (const line of lines) {
      const lineMatch = line.match(/^LINE (\d+): \[(.+?)\] (.+)/);
      if (lineMatch) {
        if (currentIssue && currentSuggestion) {
          comments.push({
            path: analysis.filename,
            position: parseInt(currentIssue.line),
            body: `**${currentIssue.type}**: ${currentIssue.description}\n\n${currentSuggestion}`
          });
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

    // Add the last comment
    if (currentIssue && currentSuggestion) {
      comments.push({
        path: analysis.filename,
        position: parseInt(currentIssue.line),
        body: `**${currentIssue.type}**: ${currentIssue.description}\n\n${currentSuggestion}`
      });
    }
  }

  // Create the review with inline comments
  if (comments.length > 0) {
    await octokit.pulls.createReview({
      owner,
      repo,
      pull_number,
      commit_id: head_sha,
      event: 'COMMENT',
      comments,
      body: overallAnalysis
    });
  } else {
    // If no inline comments, still post the overall analysis
    await octokit.issues.createComment({
      owner,
      repo,
      issue_number: pull_number,
      body: overallAnalysis
    });
  }
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
      const { files, head_sha, pr } = await getPRDetails(owner, repo, prNumber);

      // Analyze the entire PR
      const overallAnalysis = await analyzePR(pr, files);

      // Analyze each file individually
      const fileAnalyses = await Promise.all(
        files.map(async file => ({
          filename: file.filename,
          content: await analyzeFile(file.filename, file.patch)
        }))
      );

      // Create review with both inline comments and overall analysis
      await createReview(owner, repo, prNumber, head_sha, fileAnalyses, overallAnalysis);
    }

    res.status(200).json({ message: 'Webhook processed successfully' });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ error: error.message });
  }
}
