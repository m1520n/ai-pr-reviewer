import { createAppAuth } from '@octokit/auth-app';
import { Octokit } from '@octokit/rest';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { code, installation_id } = req.query;

    if (!code || !installation_id) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Create an authenticated Octokit instance using the app's credentials
    const auth = createAppAuth({
      appId: process.env.GITHUB_APP_ID,
      privateKey: process.env.GITHUB_PRIVATE_KEY.replace(/\\n/g, '\n'),
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    });

    // Get an installation access token
    const installationAuthentication = await auth({
      type: 'installation',
      installationId: installation_id,
    });

    // Create an Octokit instance with the installation token
    const octokit = new Octokit({
      auth: installationAuthentication.token,
    });

    // Get installation details
    const { data: installation } = await octokit.apps.getInstallation({
      installation_id: installation_id,
    });

    // Store the installation token securely if needed
    // Note: In a production environment, you should store this in a secure database
    console.log('Installation successful for:', {
      account: installation.account.login,
      repository_selection: installation.repository_selection,
      installation_id,
    });

    // Redirect to a success page or the repository
    const successUrl = installation.repository_selection === 'all' 
      ? `https://github.com/organizations/${installation.account.login}/settings/installations/${installation_id}`
      : `https://github.com/${installation.account.login}/${installation.repositories[0]?.name}`;

    res.redirect(successUrl);
  } catch (error) {
    console.error('Error handling callback:', error);
    res.status(500).json({ 
      error: 'Failed to complete installation',
      details: error.message 
    });
  }
} 