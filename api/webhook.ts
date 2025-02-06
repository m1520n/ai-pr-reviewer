import { Request, Response } from "express";
import { verifyWebhookSignature } from "../src/utils/security.js";
import { handlePREvent } from "../src/services/pr.js";

export const maxDuration = 60;

// List of PR actions we want to handle
const SUPPORTED_ACTIONS = [
  "opened",
  "draft",
  "ready_for_review",
  "synchronize",
];
const PR_EVENT = "pull_request";

export default async function handler(req: Request, res: Response): Promise<void> {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const event = req.headers["x-github-event"];
  if (!event) {
    console.error("Missing x-github-event header");
    res.status(400).json({ error: "Missing x-github-event header" });
    return;
  }

  try {
    // Verify the webhook signature
    verifyWebhookSignature(req);

    const payload = req.body;

    if (!payload || !payload.action) {
      console.error("Invalid webhook payload", payload);
      res.status(400).json({ error: "Invalid webhook payload" });
      return;
    }

    if (event === PR_EVENT && SUPPORTED_ACTIONS.includes(payload.action)) {
      console.log(`Processing ${event} event with action ${payload.action}`);
      await handlePREvent(payload);
      res.status(200).json({
        message: "Webhook processed successfully",
        action: payload.action,
      });
      return;
    }

    res.status(200).json({ error: "Unsupported event or action" });
  } catch (error) {
    console.error("Error processing webhook:", {
      event,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    const statusCode = error instanceof Error && error.name === "ValidationError" ? 400 : 500;
    res.status(statusCode).json({
      error: error instanceof Error ? error.message : "Unknown error",
      type: error instanceof Error ? error.name : "UnknownError",
    });
  }
}
