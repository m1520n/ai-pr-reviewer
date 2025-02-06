import { Request, Response } from "express";
import { verifyWebhookSignature } from "../src/utils/security";
import { handlePREvent } from "../src/services/pr";

export const maxDuration = 60;

// List of PR actions we want to handle
const SUPPORTED_ACTIONS = [
  "opened",
  "draft",
  "ready_for_review",
  "synchronize",
];
const PR_EVENT = "pull_request";

export default async function handler(req: Request, res: Response) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const event = req.headers["x-github-event"];
  if (!event) {
    return res.status(400).json({ error: "Missing x-github-event header" });
  }

  try {
    // Verify the webhook signature
    verifyWebhookSignature(req);

    const payload = req.body;

    if (!payload || !payload.action) {
      return res.status(400).json({ error: "Invalid webhook payload" });
    }

    if (event === PR_EVENT && SUPPORTED_ACTIONS.includes(payload.action)) {
      console.log(`Processing ${event} event with action ${payload.action}`);
      await handlePREvent(payload);
      res.status(200).json({
        message: "Webhook processed successfully",
        action: payload.action,
      });
    }
  } catch (error) {
    console.error("Error processing webhook:", {
      event,
      error: error.message,
      stack: error.stack,
    });

    const statusCode = error.name === "ValidationError" ? 400 : 500;
    res.status(statusCode).json({
      error: error.message,
      type: error.name,
    });
  }
}
