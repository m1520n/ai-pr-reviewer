const { Octokit } = require("@octokit/rest");
const crypto = require('crypto');
const OpenAI = require('openai');

export const maxDuration = 60; // This function can run for a maximum of 60 seconds

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

// Function to get PR diff
async function getPRDiff(owner, repo, pull_number) {
  const { data: files } = await octokit.pulls.listFiles({
    owner,
    repo,
    pull_number,
  });
  
  return files.map(file => ({
    filename: file.filename,
    patch: file.patch || '',
    status: file.status
  }));
}

// Function to analyze PR with AI
async function analyzeWithAI(prDetails, diff) {
  const prompt = `Please review this pull request:
Title: ${prDetails.title}
Description: ${prDetails.body || 'No description provided'}

Changes:
${diff.map(file => `
File: ${file.filename}
Status: ${file.status}
Diff:
${file.patch || 'No diff available'}`).join('\n')}

Please provide a code review focusing on:
1. Potential bugs or issues
2. Code style and best practices
3. Security concerns
4. Performance implications
5. Suggestions for improvement

Format your response in a clear, constructive manner.`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
    max_tokens: 1500
  });

  return completion.choices[0].message.content;
}

export default async function handler(req, res) {
  // Only allow POST requests
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

        // Get PR diff
        const diff = await getPRDiff(owner, repo, prNumber);

        // Analyze with AI
        const aiReview = await analyzeWithAI(pull_request, diff);

        // Post review comment
        await octokit.issues.createComment({
          owner,
          repo,
          issue_number: prNumber,
          body: aiReview
        });
      }
    }

    res.status(200).json({ message: 'Webhook processed successfully' });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ error: error.message });
  }
} 