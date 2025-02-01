# AI PR Reviewer

An intelligent GitHub PR review bot that automatically analyzes pull requests using GPT-4 to provide detailed code reviews and suggestions.

## Features

- 🤖 Automatic PR analysis using GPT-4
- 🔍 In-depth code review focusing on:
  - Potential bugs and issues
  - Code style and best practices
  - Security vulnerabilities
  - Performance implications
  - Improvement suggestions
- 🔒 Secure webhook handling with signature verification
- ⚡ Real-time PR feedback
- 📝 Detailed, constructive review comments

## Prerequisites

- Node.js 14 or higher
- npm or yarn
- GitHub account with repository admin access
- OpenAI API key
- Vercel account

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/ai-pr-reviewer.git
   cd ai-pr-reviewer
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create and configure environment variables:
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your credentials:
   ```
   PORT=3000
   GITHUB_TOKEN=your_github_token_here
   OPENAI_API_KEY=your_openai_api_key_here
   WEBHOOK_SECRET=your_webhook_secret_here
   ```

4. Generate WEBHOOK_SECRET and copy into .env and GitHub Webhook secret
   ```bash
   openssl rand -base64 32
   ```

## Vercel Setup

1. Create a Vercel account
2. Deploy the app to Vercel

## GitHub Setup

1. Add Webhook to GitHub
   - Go to your repository
   - Click on Settings
   - Click on Webhooks
   - Click on Add webhook
   - Set the URL to your Vercel URL
   - Set the content type to application/json
   - Set the secret to the WEBHOOK_SECRET you generated
   - Set the events to Pull request
   - Set the active to true

2. Set Required Permissions:
   - Repository Permissions:
     - Pull requests: `Read & Write`
     - Contents: `Read`
     - Issues: `Write`

## Usage

Once set up, the bot will automatically:

1. Monitor all pull requests in repositories where it's installed
2. Analyze new PRs and PR updates using GPT-4
3. Post detailed review comments including:
   - Code quality assessment
   - Potential issues
   - Security concerns
   - Suggested improvements
