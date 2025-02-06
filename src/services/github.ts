import { Octokit } from "@octokit/rest";
import { createAppAuth } from "@octokit/auth-app";
import type { RestEndpointMethodTypes } from "@octokit/plugin-rest-endpoint-methods";
import { PRFile, ReviewComment } from "../types";

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

    // Process files and calculate positions for each line.
    // This is a workaround for the fact that the GitHub API doesn't provide line numbers for the positions.
    const filteredFiles = files
      .filter((file: GitHubFile) => file.status !== "removed")
      .map((file: GitHubFile): PRFile => {
        // For new files, each line number is its own position
        if (file.status === "added") {
          const positions = new Map<number, number>();
          const lines = (file.patch || "").split("\n");
          let lineNumber = 1;

          lines.forEach((line, index) => {
            if (line.startsWith("+") || !line.startsWith("-")) {
              positions.set(lineNumber, index);
              lineNumber++;
            }
          });

          return {
            filename: file.filename,
            patch: file.patch || "No changes available",
            status: file.status,
            positions,
            raw_patch: file.patch,
          };
        }

        // For modified files, use the hunk-based approach
        const positions = new Map<number, number>();
        let currentLine = 0;

        if (file.patch) {
          const hunks = file.patch.split("\n");
          let position = 0;
          let inHunk = false;

          hunks.forEach((line) => {
            if (line.startsWith("@@")) {
              const match = line.match(/@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
              if (match) {
                currentLine = parseInt(match[1], 10);
                inHunk = true;
              }
            } else if (inHunk) {
              if (!line.startsWith("-")) {
                positions.set(currentLine, position);
                currentLine++;
              }
              position++;
            }
          });
        }

        return {
          filename: file.filename,
          patch: file.patch || "No changes available",
          status: file.status,
          positions,
          raw_patch: file.patch,
        };
      });

    return filteredFiles;
  } catch (error) {
    console.error("Error in getPRFiles:", error);
    throw error;
  }
}

/**
 * Find the position for a specific line number in a file
 * @param file - The PRFile object containing the file information
 * @param lineNumber - The line number to find the position for
 * @returns The position of the line number in the file, or null if not found
 */
export function findPositionForLine(
  file: PRFile,
  lineNumber: number
): number | null {
  const position = file.positions.get(lineNumber);
  if (position !== undefined) {
    console.log(
      `Found position ${position} for line ${lineNumber} in ${file.filename}`
    );
    return position;
  }
  console.log(`No position found for line ${lineNumber} in ${file.filename}`);
  console.log("Available positions:", Array.from(file.positions.entries()));
  return null;
}

/**
 * Create a review for a specific pull request
 * @param owner - The owner of the repository
 * @param repo - The repository name
 * @param pullNumber - The pull request number
 * @param comments - The comments to post in the review
 * @param files - The files to review
 * @param installationId - The installation ID to get the Octokit instance for
 */
export async function createReview(
  owner: string,
  repo: string,
  pullNumber: number,
  comments: ReviewComment[],
  files: PRFile[],
  installationId: number
): Promise<void> {
  try {
    if (comments.length === 0) {
      console.log("No comments to post, skipping review creation");
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

    if (reviewComments.length > 0) {
      await octokit.pulls.createReview({
        owner,
        repo,
        pull_number: pullNumber,
        event: "COMMENT",
        comments: reviewComments,
      });
      console.log("Review created successfully");
    } else {
      console.log("No valid comments to post after position mapping");
    }
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
