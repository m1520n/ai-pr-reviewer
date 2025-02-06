import crypto from 'crypto';

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

export default { verifyWebhookSignature };
