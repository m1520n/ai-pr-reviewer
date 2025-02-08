export type FileStatus = 'added' | 'modified' | 'removed' | 'renamed' | 'copied' | 'changed' | 'unchanged';

export interface PRFile {
  filename: string;
  patch?: string;
  status: FileStatus;
  positions: Map<number, number>;
  raw_patch?: string;
}

export interface AnalysisResult {
  filename: string;
  analysis: string;
}

export interface ReviewComment {
  path: string;
  line: number;
  body: string;
}

export interface PREventPayload {
  action: 'opened' | 'synchronize' | 'draft' | 'ready_for_review';
  pull_request: {
    number: number;
    title: string;
    body?: string;
    head: {
      sha: string;
      ref: string;
      repo: {
        name: string;
        full_name: string;
        owner: {
          login: string;
        };
      };
    };
    base: {
      sha: string;
      ref: string;
      repo: {
        name: string;
        full_name: string;
        owner: {
          login: string;
        };
      };
    };
  };
  repository: {
    name: string;
    full_name: string;
    owner: {
      login: string;
    };
  };
  installation: {
    id: number;
  };
}

export interface AIServiceConfig {
  model: string;
  maxTokensAnalysis: number;
  maxTokensDescription: number;
}

export interface ValidationError extends Error {
  name: 'ValidationError';
  statusCode: number;
}

export interface GitHubError extends Error {
  status: number;
  documentation_url?: string;
}

// Environment variables type
export interface EnvVars {
  GITHUB_APP_ID: string;
  GITHUB_PRIVATE_KEY: string;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  WEBHOOK_SECRET: string;
  OPENAI_API_KEY: string;
  OPENAI_MODEL?: string;
  PORT?: string;
}

// API Response types
export interface APIResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    type: string;
    details?: unknown;
  };
}

// Webhook signature verification
export interface SignatureVerificationResult {
  isValid: boolean;
  error?: string;
}

// Review types
export interface ReviewRequest {
  owner: string;
  repo: string;
  pull_number: number;
  event: 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT';
  body?: string;
  comments?: ReviewComment[];
}

export interface ComplexityMetrics {
  filesChanged: number;
  linesAdded: number;
  linesRemoved: number;
  cyclomaticComplexity: number;
}

export interface ComplexityReport {
  score: number;
  metrics: ComplexityMetrics;
  level: 'low' | 'moderate' | 'high';
  recommendations: string[];
} 