import { getPRFiles, updatePRDescription, createReview } from "./github.js";
import { generatePRDescription, analyzeFiles } from "./ai.js";
import { processAnalyses } from "./comment.js";
import { analyzePRComplexity, formatComplexityReport } from "./complexity.js";
import { PRFile } from "../types/index.js";

type Payload = {
  pull_request: {
    number: number;
  };
  repository: {
    owner: { login: string };
    name: string;
  };
  action: string;
  installation: {
    id: number;
  };
};

/**
 * Handle a pull request event
 * @param payload - The payload of the pull request event
 */
export const handlePREvent = async (payload: Payload) => {
  try {
    console.log("Starting PR processing...");
    const { pull_request, repository, action, installation } = payload;

    if (!installation?.id) {
      throw new Error("Missing installation ID in webhook payload");
    }

    const prNumber = pull_request.number;
    const owner = repository.owner.login;
    const repo = repository.name;
    const installationId = installation.id;

    console.log(
      `Processing PR #${prNumber} in ${owner}/${repo}, action: ${action}, installation: ${installationId}`
    );

    // Get files for analysis
    const files = await getPRFiles(owner, repo, prNumber, installationId);

    // Handle different PR events
    switch (action) {
      case "opened":
      case "ready_for_review":
        // Generate description and perform review
        await handleNewPR(owner, repo, prNumber, files, installationId);
        break;

      case "draft":
        // Only generate description, no review needed
        await handleDraftPR(owner, repo, prNumber, files, installationId);
        break;

      case "synchronize":
        // Only perform review on code changes
        await handlePRSync(owner, repo, prNumber, files, installationId);
        break;
    }
  } catch (error) {
    console.error("Error in handlePREvent:", error);
    throw error;
  }
};

/**
 * Handle a new pull request
 * @param owner - The owner of the repository
 * @param repo - The repository name
 * @param prNumber - The pull request number
 * @param files - The files to analyze
 * @param installationId - The installation ID to get the Octokit instance for
 */
export const handleNewPR = async (
  owner: string,
  repo: string,
  prNumber: number,
  files: PRFile[],
  installationId: number
) => {
  console.log("Handling new PR...");

  // Generate and update description
  const description = (await generatePRDescription(files)) || "";
  await updatePRDescription(owner, repo, prNumber, description, installationId);

  // Perform code review
  await performCodeReview(owner, repo, prNumber, files, installationId);
};

/**
 * Handle a draft pull request
 * @param owner - The owner of the repository
 * @param repo - The repository name
 * @param prNumber - The pull request number
 * @param files - The files to analyze
 * @param installationId - The installation ID to get the Octokit instance for
 */
export const handleDraftPR = async (
  owner: string,
  repo: string,
  prNumber: number,
  files: PRFile[],
  installationId: number
) => {
  console.log("Handling draft PR...");

  // Only generate and update description
  const description = (await generatePRDescription(files)) || "";
  await updatePRDescription(owner, repo, prNumber, description, installationId);
};

/**
 * Handle a PR sync
 * @param owner - The owner of the repository
 * @param repo - The repository name
 * @param prNumber - The pull request number
 * @param files - The files to analyze
 * @param installationId - The installation ID to get the Octokit instance for
 */
export const handlePRSync = async (
  owner: string,
  repo: string,
  prNumber: number,
  files: PRFile[],
  installationId: number
) => {
  console.log("Handling PR sync...");

  // Only perform code review
  await performCodeReview(owner, repo, prNumber, files, installationId);
};

/**
 * Perform a code review
 * @param owner - The owner of the repository
 * @param repo - The repository name
 * @param prNumber - The pull request number
 * @param files - The files to analyze
 * @param installationId - The installation ID to get the Octokit instance for
 */
export const performCodeReview = async (
  owner: string,
  repo: string,
  prNumber: number,
  files: PRFile[],
  installationId: number
) => {
  // Analyze files and create review comments
  const analyses = await analyzeFiles(files);
  console.log("AI analyses completed");

  const comments = processAnalyses(analyses);
  console.log(`Generated ${comments.length} comments`);

  // Generate complexity report
  const complexityReport = analyzePRComplexity(files);
  const formattedReport = formatComplexityReport(complexityReport);
  console.log("Generated complexity report");

  // Create review with both comments and complexity report
  await createReview(
    owner,
    repo,
    prNumber,
    comments,
    files,
    installationId,
    formattedReport
  );
  console.log("Review created with comments and complexity report");
};
