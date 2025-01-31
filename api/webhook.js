const { verifyWebhookSignature } = require('../src/utils/security');
const prService = require('../src/services/pr');

export const maxDuration = 60;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Received webhook event:', req.headers['x-github-event']);
    verifyWebhookSignature(req);
    
    const event = req.headers['x-github-event'];
    const payload = req.body;

    if (event === 'pull_request' && 
        (payload.action === 'opened' || payload.action === 'synchronize')) {
      console.log('Processing PR event:', {
        action: payload.action,
        pr: payload.pull_request.number,
        repo: payload.repository.full_name
      });
      
      await prService.handlePREvent(payload);
      console.log('PR processing completed successfully');
    } else {
      console.log('Skipping event:', event, payload.action);
    }

    res.status(200).json({ message: 'Webhook processed successfully' });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ error: error.message });
  }
}
