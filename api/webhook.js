const { verifyWebhookSignature } = require('../src/utils/security');
const prService = require('../src/services/pr');

export const maxDuration = 60;

// List of PR actions we want to handle
const SUPPORTED_ACTIONS = ['opened', 'draft', 'ready_for_review', 'synchronize'];

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const event = req.headers['x-github-event'];
  if (!event) {
    return res.status(400).json({ error: 'Missing x-github-event header' });
  }

  try {
    verifyWebhookSignature(req);
    
    const payload = req.body;
    if (!payload || !payload.action) {
      return res.status(400).json({ error: 'Invalid webhook payload' });
    }

    if (event === 'pull_request' && SUPPORTED_ACTIONS.includes(payload.action)) {
      console.log(`Processing ${event} event with action ${payload.action}`);
      await prService.handlePREvent(payload);
      res.status(200).json({ 
        message: 'Webhook processed successfully',
        action: payload.action
      });
    } else {
      console.log(`Skipping event: ${event} with action: ${payload.action}`);
      res.status(200).json({ 
        message: 'Event skipped - not a supported PR action',
        event,
        action: payload.action
      });
    }
  } catch (error) {
    console.error('Error processing webhook:', {
      event,
      error: error.message,
      stack: error.stack
    });
    
    const statusCode = error.name === 'ValidationError' ? 400 : 500;
    res.status(statusCode).json({ 
      error: error.message,
      type: error.name 
    });
  }
}
