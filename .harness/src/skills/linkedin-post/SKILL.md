---
name: linkedin-post
description: Use when drafting, previewing, or publishing a plain text LinkedIn feed post from this repository. Always show the user the exact post text preview before using the LinkedIn posting CLI, and only publish after explicit user confirmation.
---

# LinkedIn Post

Use this skill for plain text LinkedIn feed posts only. This repository's CLI intentionally does not support LinkedIn direct messages, scraping automation, images, videos, targeting, sponsored posts, or browser-session posting.

## Required Preview

Before publishing, show the user the exact message that would be posted. Preserve line breaks and links. Ask for explicit confirmation before posting unless the user has already provided an unambiguous publish instruction for the exact final text in the same turn.

Do not post if the text is still a draft, contains placeholders, exposes private information, or the user has not approved the final wording.

## CLI

Use the repo CLI:

```bash
pnpm linkedin:post --file path/to/message.txt
pnpm linkedin:post --file path/to/message.txt --yes
```

The CLI reads credentials from environment variables:

- `LINKEDIN_ACCESS_TOKEN`: OAuth token with `w_member_social` or `w_organization_social`.
- `LINKEDIN_AUTHOR_URN`: `urn:li:person:{id}` or `urn:li:organization:{id}`.
- `LINKEDIN_VERSION`: optional LinkedIn API version in `YYYYMM` format.

The CLI defaults to dry run mode and prints the request payload without secrets. Add `--yes` only after the preview/confirmation requirement above is satisfied.

Prefer `--file` for multi-line posts so shell quoting cannot alter the message. Temporary files are acceptable for agent workflow, but do not commit draft post files unless the user explicitly asks for that.

## Failure Handling

If posting fails, report the HTTP status and LinkedIn error summary without printing tokens. Do not retry repeatedly; ask the user to check LinkedIn app approval, token scopes, token expiry, and whether the configured author URN matches the token.
