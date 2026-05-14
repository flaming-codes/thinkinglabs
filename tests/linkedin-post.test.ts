import { describe, expect, it } from "vite-plus/test";
import {
  createLinkedInDryRun,
  createLinkedInTextPostPayload,
  DEFAULT_LINKEDIN_VERSION,
  publishLinkedInTextPost,
  type FetchLike,
} from "../src/lib/linkedin-post.ts";

describe("LinkedIn text post payloads", () => {
  it("builds the narrow text-only Posts API payload", () => {
    expect(createLinkedInTextPostPayload("urn:li:person:abc123", "Hello LinkedIn")).toEqual({
      author: "urn:li:person:abc123",
      commentary: "Hello LinkedIn",
      visibility: "PUBLIC",
      distribution: {
        feedDistribution: "MAIN_FEED",
        targetEntities: [],
        thirdPartyDistributionChannels: [],
      },
      lifecycleState: "PUBLISHED",
      isReshareDisabledByAuthor: false,
    });
  });

  it("rejects empty messages and non-author URNs", () => {
    expect(() => createLinkedInTextPostPayload("urn:li:person:abc123", " ")).toThrow(
      "message must not be empty",
    );
    expect(() => createLinkedInTextPostPayload("urn:li:share:123", "Hello")).toThrow(
      "author must be a LinkedIn person or organization URN",
    );
  });

  it("creates a dry run without secrets", () => {
    expect(
      createLinkedInDryRun({
        authorUrn: "urn:li:organization:123",
        message: "Draft",
      }),
    ).toMatchObject({
      version: DEFAULT_LINKEDIN_VERSION,
      payload: {
        author: "urn:li:organization:123",
        commentary: "Draft",
      },
    });
  });
});

describe("publishLinkedInTextPost", () => {
  it("sends the expected headers and body, returning x-restli-id", async () => {
    const calls: Array<{ input: string; init: Parameters<FetchLike>[1] }> = [];
    const fetcher: FetchLike = async (input, init) => {
      calls.push({ input, init });
      return {
        status: 201,
        headers: {
          get: (name) => (name.toLowerCase() === "x-restli-id" ? "urn:li:share:1" : null),
        },
        text: async () => "",
      };
    };

    const result = await publishLinkedInTextPost({
      accessToken: "secret-token",
      authorUrn: "urn:li:person:abc123",
      message: "Hello",
      version: "202604",
      fetch: fetcher,
    });

    expect(result.id).toBe("urn:li:share:1");
    expect(calls).toHaveLength(1);
    expect(calls[0]?.input).toBe("https://api.linkedin.com/rest/posts");
    expect(calls[0]?.init.headers).toMatchObject({
      Authorization: "Bearer secret-token",
      "Content-Type": "application/json",
      "Linkedin-Version": "202604",
      "X-Restli-Protocol-Version": "2.0.0",
    });
    expect(JSON.parse(calls[0]?.init.body ?? "{}")).toMatchObject({
      author: "urn:li:person:abc123",
      commentary: "Hello",
    });
  });

  it("rejects missing tokens before making a network call", async () => {
    let called = false;
    const fetcher: FetchLike = async () => {
      called = true;
      throw new Error("unreachable");
    };

    await expect(
      publishLinkedInTextPost({
        accessToken: " ",
        authorUrn: "urn:li:person:abc123",
        message: "Hello",
        fetch: fetcher,
      }),
    ).rejects.toThrow("LINKEDIN_ACCESS_TOKEN is required");
    expect(called).toBe(false);
  });

  it("surfaces non-201 responses without exposing the access token", async () => {
    const fetcher: FetchLike = async () => ({
      status: 403,
      headers: { get: () => null },
      text: async () => "permission denied",
    });

    await expect(
      publishLinkedInTextPost({
        accessToken: "super-secret",
        authorUrn: "urn:li:person:abc123",
        message: "Hello",
        fetch: fetcher,
      }),
    ).rejects.toThrow("LinkedIn post failed with HTTP 403: permission denied");
  });
});
