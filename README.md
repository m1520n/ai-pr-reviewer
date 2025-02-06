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
- 📝 Automatic PR description generation
- 🔒 Secure GitHub App integration
- ⚡ Real-time PR feedback
- 📋 Detailed, constructive review comments

## Prerequisites

- Node.js 14 or higher
- npm or yarn
- GitHub account with repository admin access
- OpenAI API key
- Vercel account (recommended for deployment)

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
   
   Edit `.env` with your credentials (see GitHub App setup section below).

## GitHub App Setup

1. Create a new GitHub App:
   - Go to your GitHub Settings > Developer settings > GitHub Apps
   - Click "New GitHub App"
   - Fill in the following details:
     - Name: "AI PR Reviewer" (or your preferred name)
     - Homepage URL: Your Vercel deployment URL
     - Webhook URL: `https://your-vercel-url/api/webhook`
     - Webhook Secret: Generate one with `openssl rand -base64 32`

2. Set Required Permissions:
   - Repository Permissions:
     - Pull requests: `Read & Write`
     - Contents: `Read`
     - Metadata: `Read`
   - Subscribe to events:
     - Pull request
     - Pull request review

3. Generate a Private Key:
   - After creating the app, scroll down to "Private keys"
   - Click "Generate a private key"
   - Save the downloaded key

4. Note down the following values:
   - App ID (shown on the app's page)
   - Client ID (shown on the app's page)
   - Client Secret (generate if needed)

5. Configure Environment Variables:
   ```
   GITHUB_APP_ID=your_app_id
   GITHUB_CLIENT_ID=your_client_id
   GITHUB_CLIENT_SECRET=your_client_secret
   GITHUB_PRIVATE_KEY=your_private_key
   WEBHOOK_SECRET=your_webhook_secret
   ```
   
   Note: For GITHUB_PRIVATE_KEY, replace newlines with \n:
   ```bash
   cat your-private-key.pem | awk -v ORS='\\n' '1' | pbcopy
   ```

## Vercel Deployment

1. Push your code to GitHub
2. Create a new project in Vercel
3. Import your repository
4. Configure environment variables in Vercel
5. Deploy

## Installing the App

1. Go to your GitHub App's public page:
   `https://github.com/apps/your-app-name`

2. Click "Install"

3. Choose where to install:
   - All repositories
   - Select repositories

4. The app will automatically:
   - Generate descriptions for new PRs
   - Analyze code in PRs
   - Post review comments

## Usage

Once installed, the app will automatically:

1. When a draft PR is created:
   - Generate a detailed PR description
   - No code review yet

2. When a PR is opened or ready for review:
   - Generate a detailed PR description (if not already present)
   - Perform a thorough code review
   - Post review comments

3. When changes are pushed:
   - Perform an incremental code review
   - Post new review comments if needed

## Configuration

You can customize the behavior by modifying:
- `OPENAI_MODEL` in `.env` for different AI models
- Review focus areas in `src/services/ai.js`
- PR description format in `src/services/ai.js`

## Support

If you encounter any issues or have questions, please open an issue in the repository.
