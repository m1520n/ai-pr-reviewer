import { Request, Response } from 'express';

export default function handler(req: Request, res: Response) {
  res.status(200).json({ status: 'AI PR Reviewer is running!' });
}
