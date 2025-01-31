require("dotenv").config();
const express = require("express");
const { Octokit } = require("@octokit/rest");

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Octokit with GitHub token
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN
});

app.use(express.json());

// Health check endpoint
app.get("/", (req, res) => {
  res.send("AI PR Reviewer is running!");
});

// GitHub webhook endpoint
app.post("/webhook", async (req, res) => {
  const event = req.headers['x-github-event'];
  const payload = req.body;

  if (event === 'pull_request') {
    try {
      if (payload.action === 'opened' || payload.action === 'synchronize') {
        const { pull_request, repository } = payload;
        
        // Get PR details
        const prNumber = pull_request.number;
        const owner = repository.owner.login;
        const repo = repository.name;

        // TODO: Implement AI review logic here
        const reviewComment = "Thanks for the PR! I'll review it shortly.";

        // Post comment on PR
        await octokit.issues.createComment({
          owner,
          repo,
          issue_number: prNumber,
          body: reviewComment
        });
      }
    } catch (error) {
      console.error('Error processing webhook:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  res.status(200).json({ message: 'Webhook processed successfully' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
