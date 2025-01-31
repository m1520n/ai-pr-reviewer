const { verifyWebhookSignature } = require('../src/utils/security');
const prService = require('../src/services/pr');

export const maxDuration = 60;

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
      
      await prService.handlePREvent(payload);
    } else {
      console.log('Skipping event:', event, payload.action);
    }

    res.status(200).json({ message: 'Webhook processed successfully' });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ error: error.message });
  }
}
