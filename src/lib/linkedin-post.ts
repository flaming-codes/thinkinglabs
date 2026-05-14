/** Default LinkedIn Marketing API version used when LINKEDIN_VERSION is not set. */
export const DEFAULT_LINKEDIN_VERSION = "202604";

/** LinkedIn Posts API endpoint for creating feed posts. */
export const LINKEDIN_POSTS_ENDPOINT = "https://api.linkedin.com/rest/posts";

/** Minimal text-only payload accepted by LinkedIn's Posts API. */
export interface LinkedInTextPostPayload {
  readonly author: string;
  readonly commentary: string;
  readonly visibility: "PUBLIC";
  readonly distribution: {
    readonly feedDistribution: "MAIN_FEED";
    readonly targetEntities: readonly [];
    readonly thirdPartyDistributionChannels: readonly [];
  };
  readonly lifecycleState: "PUBLISHED";
  readonly isReshareDisabledByAuthor: false;
}

/** Inputs needed to publish a text-only LinkedIn feed post. */
export interface LinkedInPostRequest {
  readonly accessToken: string;
  readonly authorUrn: string;
  readonly message: string;
  readonly version?: string | undefined;
  readonly endpoint?: string | undefined;
  readonly fetch?: FetchLike | undefined;
}

/** Successful LinkedIn post response metadata. */
export interface LinkedInPostResult {
  readonly id: string | null;
  readonly status: number;
  readonly responseBody: string;
}

/** Secret-free preview of the request the CLI would send. */
export interface LinkedInDryRun {
  readonly endpoint: string;
  readonly version: string;
  readonly payload: LinkedInTextPostPayload;
}

/** Small response surface used to keep tests independent of the global Response type. */
export interface FetchResponseLike {
  readonly status: number;
  readonly headers: {
    get(name: string): string | null;
  };
  text(): Promise<string>;
}

/** Fetch-compatible dependency used by the publisher and tests. */
export type FetchLike = (
  input: string,
  init: {
    readonly method: "POST";
    readonly headers: Record<string, string>;
    readonly body: string;
  },
) => Promise<FetchResponseLike>;

/** Error type for validation and LinkedIn API failures. */
export class LinkedInPostError extends Error {
  readonly status: number | undefined;
  readonly responseBody: string | undefined;

  constructor(message: string, opts: { status?: number; responseBody?: string } = {}) {
    super(message);
    this.name = "LinkedInPostError";
    this.status = opts.status;
    this.responseBody = opts.responseBody;
  }
}

/** Create the exact text-only LinkedIn Posts API payload. */
export function createLinkedInTextPostPayload(
  authorUrn: string,
  message: string,
): LinkedInTextPostPayload {
  validateAuthorUrn(authorUrn);
  validateMessage(message);
  return {
    author: authorUrn,
    commentary: message,
    visibility: "PUBLIC",
    distribution: {
      feedDistribution: "MAIN_FEED",
      targetEntities: [],
      thirdPartyDistributionChannels: [],
    },
    lifecycleState: "PUBLISHED",
    isReshareDisabledByAuthor: false,
  };
}

/** Build a publish preview that intentionally excludes Authorization headers. */
export function createLinkedInDryRun(options: {
  readonly authorUrn: string;
  readonly message: string;
  readonly version?: string | undefined;
  readonly endpoint?: string | undefined;
}): LinkedInDryRun {
  const version = normalizeVersion(options.version);
  return {
    endpoint: options.endpoint ?? LINKEDIN_POSTS_ENDPOINT,
    version,
    payload: createLinkedInTextPostPayload(options.authorUrn, options.message),
  };
}

/** Publish a text-only LinkedIn feed post and return the created post URN when LinkedIn provides it. */
export async function publishLinkedInTextPost(
  options: LinkedInPostRequest,
): Promise<LinkedInPostResult> {
  const token = options.accessToken.trim();
  if (!token) throw new LinkedInPostError("LINKEDIN_ACCESS_TOKEN is required");

  const dryRun = createLinkedInDryRun(options);
  const fetcher = options.fetch ?? globalThis.fetch;
  if (!fetcher) throw new LinkedInPostError("fetch is not available in this runtime");

  const response = await fetcher(dryRun.endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "Linkedin-Version": dryRun.version,
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify(dryRun.payload),
  });
  const responseBody = await safeReadBody(response);

  if (response.status !== 201) {
    const detail = responseBody ? `: ${truncate(responseBody, 500)}` : "";
    throw new LinkedInPostError(`LinkedIn post failed with HTTP ${response.status}${detail}`, {
      status: response.status,
      responseBody,
    });
  }

  return {
    id: response.headers.get("x-restli-id"),
    status: response.status,
    responseBody,
  };
}

/** Normalize and validate a LinkedIn Marketing API version header value. */
export function normalizeVersion(version: string | undefined): string {
  const normalized = (version ?? DEFAULT_LINKEDIN_VERSION).trim();
  if (!/^\d{6}$/.test(normalized)) {
    throw new LinkedInPostError("LinkedIn API version must use YYYYMM format");
  }
  return normalized;
}

function validateAuthorUrn(authorUrn: string): void {
  if (!/^urn:li:(person|organization):[A-Za-z0-9_-]+$/.test(authorUrn)) {
    throw new LinkedInPostError(
      "author must be a LinkedIn person or organization URN, e.g. urn:li:person:{id}",
    );
  }
}

function validateMessage(message: string): void {
  if (!message.trim()) throw new LinkedInPostError("message must not be empty");
}

async function safeReadBody(response: FetchResponseLike): Promise<string> {
  try {
    return await response.text();
  } catch {
    return "";
  }
}

function truncate(value: string, maxLength: number): string {
  return value.length <= maxLength ? value : `${value.slice(0, maxLength)}...`;
}
