import { Octokit } from "@octokit/rest";
import { createAppAuth } from "@octokit/auth-app";
import type { RestEndpointMethodTypes } from "@octokit/plugin-rest-endpoint-methods";
import { PRFile, ReviewComment, FileStatus } from "../types/index.js";
import { processPatch, findPositionForLine } from "../utils/patch.js";

type PullsListFilesResponse =
  RestEndpointMethodTypes["pulls"]["listFiles"]["response"];
type GitHubFile = PullsListFilesResponse["data"][0];

interface ReviewCommentInput {
  path: string;
  position: number;
  body: string;
}

if (
  !process.env.GITHUB_APP_ID ||
  !process.env.GITHUB_PRIVATE_KEY ||
  !process.env.GITHUB_CLIENT_ID ||
  !process.env.GITHUB_CLIENT_SECRET
) {
  throw new Error("Missing GitHub environment variables");
}

const appAuth = createAppAuth({
  appId: process.env.GITHUB_APP_ID,
  privateKey: process.env.GITHUB_PRIVATE_KEY.replace(/\\n/g, "\n"),
  clientId: process.env.GITHUB_CLIENT_ID,
  clientSecret: process.env.GITHUB_CLIENT_SECRET,
});

/**
 * Get Octokit instance for a specific installation
 * @param installationId - The installation ID to get the Octokit instance for
 * @returns A promise resolving to the Octokit instance
 */
export async function getInstallationOctokit(
  installationId: number
): Promise<Octokit> {
  try {
    const installationAuthentication = await appAuth({
      type: "installation",
      installationId,
    });

    return new Octokit({
      auth: installationAuthentication.token,
    });
  } catch (error) {
    console.error("Error getting installation token:", error);
    throw error;
  }
}

/**
 * Get the files for a specific pull request
 * @param owner - The owner of the repository
 * @param repo - The repository name
 * @param pullNumber - The pull request number
 * @param installationId - The installation ID to get the Octokit instance for
 * @returns A promise resolving to an array of PRFile objects
 */
export async function getPRFiles(
  owner: string,
  repo: string,
  pullNumber: number,
  installationId: number
): Promise<PRFile[]> {
  try {
    const octokit = await getInstallationOctokit(installationId);
    const { data: files } = await octokit.pulls.listFiles({
      owner,
      repo,
      pull_number: pullNumber,
    });

    // Process files and calculate positions for each line
    return files
      .filter((file: GitHubFile) => file.status !== "removed")
      .map((file: GitHubFile): PRFile => 
        processPatch(file.filename, file.patch, file.status as FileStatus)
      );
  } catch (error) {
    console.error("Error in getPRFiles:", error);
    throw error;
  }
}

/**
 * Create a review for a specific pull request
 * @param owner - The owner of the repository
 * @param repo - The repository name
 * @param pullNumber - The pull request number
 * @param comments - The comments to post in the review
 * @param files - The files to review
 * @param installationId - The installation ID to get the Octokit instance for
 * @param complexityReport - Optional complexity report to include in the review
 */
export async function createReview(
  owner: string,
  repo: string,
  pullNumber: number,
  comments: ReviewComment[],
  files: PRFile[],
  installationId: number,
  complexityReport?: string
): Promise<void> {
  try {
    if (comments.length === 0 && !complexityReport) {
      console.log("No comments or complexity report to post, skipping review creation");
      return;
    }

    const octokit = await getInstallationOctokit(installationId);

    // Convert line numbers to positions
    const reviewComments = comments
      .map((comment) => {
        const file = files.find((f) => f.filename === comment.path);
        if (!file) {
          console.log(`File not found: ${comment.path}`);
          return null;
        }

        const position = findPositionForLine(file, comment.line);
        if (position === null) {
          console.log(
            `Could not find position for line ${comment.line} in ${comment.path}`
          );
          return null;
        }

        return {
          path: comment.path,
          position,
          body: comment.body,
        } as ReviewCommentInput;
      })
      .filter((comment): comment is ReviewCommentInput => comment !== null);

    console.log("Creating review with comments:", reviewComments);

    // Create review with both comments and complexity report
    await octokit.pulls.createReview({
      owner,
      repo,
      pull_number: pullNumber,
      event: "COMMENT",
      body: complexityReport,
      comments: reviewComments,
    });

    console.log("Review created successfully");
  } catch (error) {
    console.error("Error in createReview:", error);
    throw error;
  }
}

/**
 * Update the description of a specific pull request
 * @param owner - The owner of the repository
 * @param repo - The repository name
 * @param pullNumber - The pull request number
 * @param description - The new description for the pull request
 * @param installationId - The installation ID to get the Octokit instance for
 * @returns A promise resolving to void
 */
export async function updatePRDescription(
  owner: string,
  repo: string,
  pullNumber: number,
  description: string,
  installationId: number
): Promise<void> {
  try {
    console.log(`Updating PR description for ${owner}/${repo}#${pullNumber}`);
    const octokit = await getInstallationOctokit(installationId);

    await octokit.pulls.update({
      owner,
      repo,
      pull_number: pullNumber,
      body: description,
    });
    console.log("PR description updated successfully");
  } catch (error) {
    console.error("Error updating PR description:", error);
    throw error;
  }
}
