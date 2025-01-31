const crypto = require('crypto');
const dotenv = require('dotenv');
dotenv.config();
// Replace with your actual webhook secret from Vercel env variables
const secret = process.env.WEBHOOK_SECRET;

const body = {
  "action": "opened",
  "pull_request": {
    "number": 1,
    "title": "Test PR",
    "body": "This is a test pull request",
    "head": {
      "sha": "test-sha"
    }
  },
  "repository": {
    "name": "your-repo-name",
    "owner": {
      "login": "your-github-username"
    }
  }
};

const bodyString = JSON.stringify(body);
const signature = 'sha256=' + crypto.createHmac('sha256', secret)
  .update(bodyString)
  .digest('hex');

console.log('Use this body in Postman:', bodyString);
console.log('X-Hub-Signature-256:', signature);
