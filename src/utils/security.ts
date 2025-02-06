import crypto from 'crypto';

export const verifyWebhookSignature = (req) => {
  const signature = req.headers['x-hub-signature-256'];
  const secret = process.env.WEBHOOK_SECRET;

  if (!secret) {
    throw new Error('WEBHOOK_SECRET is not set');
  }

  if (!signature) {
    throw new Error('No signature found');
  }

  const hmac = crypto.createHmac('sha256', secret);
  const digest = 'sha256=' + hmac.update(JSON.stringify(req.body)).digest('hex');

  if (signature !== digest) {
    throw new Error('Invalid signature');
  }
};
