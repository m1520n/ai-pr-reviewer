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

## GitHub App Setup

1. Create a new GitHub App:
   - Go to [GitHub Developer Settings](https://github.com/settings/developers)
   - Select "GitHub Apps" → "New GitHub App"
   - Fill in the following details:
     - Name: `Your PR Reviewer Name`
     - Homepage URL: Your server URL
     - Webhook URL: `https://your-domain.com/webhook`
     - Webhook Secret: Generate a secure random string
   
2. Set Required Permissions:
   - Repository Permissions:
     - Pull requests: `Read & Write`
     - Contents: `Read`
     - Issues: `Write`
   
3. Subscribe to Events:
   - Pull request

4. After creating the app:
   - Generate and download a private key
   - Note your GitHub App ID
   - Save your webhook secret in the `.env` file

## Deployment

### Option 1: Local Development

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Use ngrok to create a public URL:
   ```bash
   ngrok http 3000
   ```

3. Update your GitHub App's webhook URL with the ngrok URL

### Option 2: Production Deployment

Deploy to your preferred hosting platform:

- Heroku
- DigitalOcean
- AWS
- Any other platform supporting Node.js

Remember to:
1. Set up all environment variables
2. Ensure HTTPS is enabled
3. Update the GitHub App webhook URL

## Usage

Once set up, the bot will automatically:

1. Monitor all pull requests in repositories where it's installed
2. Analyze new PRs and PR updates using GPT-4
3. Post detailed review comments including:
   - Code quality assessment
   - Potential issues
   - Security concerns
   - Suggested improvements

## Example Review

The bot will provide reviews in this format:
