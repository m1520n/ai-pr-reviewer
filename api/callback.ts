import { Request, Response } from 'express';
import { getInstallationOctokit } from '../src/services/github.js';

export default async function handler(
  req: Request,
  res: Response
): Promise<void> {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const code = req.query.code as string;
    const installationId = req.query.installation_id as string;

    if (!code || !installationId) {
      res.status(400).json({ error: 'Missing required parameters' });
      return;
    }

    // Get an Octokit instance for this installation
    const octokit = await getInstallationOctokit(parseInt(installationId, 10));

    // Get installation details
    const { data: installation } = await octokit.apps.getInstallation({
      installation_id: parseInt(installationId, 10),
    });

    if (!installation.account) {
      throw new Error('Installation account not found');
    }

    // Get the account name based on the type of account
    const accountName = 'name' in installation.account 
      ? installation.account.name 
      : installation.account.login;

    if (!accountName) {
      throw new Error('Account name not found');
    }

    // Store the installation token securely if needed
    // Note: In a production environment, you should store this in a secure database
    console.log('Installation successful for:', {
      account: accountName,
      repository_selection: installation.repository_selection,
      installation_id: installationId,
    });

    // Redirect to a success page or the repository
    const successUrl = installation.repository_selection === 'all'
      ? `https://github.com/organizations/${accountName}/settings/installations/${installationId}`
      : `https://github.com/${accountName}`;

    res.redirect(successUrl);
  } catch (error) {
    console.error('Error handling callback:', error);
    res.status(500).json({
      error: 'Failed to complete installation',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
