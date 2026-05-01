# launchd agent plists

Five launchd plists wire the M5 background agents to macOS's launchd. They are optional — running `pnpm <agent>` manually works fine for ad-hoc use. Installing these plists keeps the agents running on a schedule against the persistent working tree so that rejection memory (stored in gitignored state files at the repo root) survives across runs.

See `docs/architecture/ADR-009-proposal-confirmation-pattern.md` for the rationale.

## Before you install

### 1. Copy plists and replace `__REPO_ROOT__`

Keep the tracked plist templates unchanged. Copy them into `~/Library/LaunchAgents`, then replace `__REPO_ROOT__` in the copies with the absolute path to this repo:

```sh
REPO=$(pwd)
mkdir -p ~/Library/LaunchAgents
for f in scripts/launchd/com.tom.me.*.plist; do
  dst="$HOME/Library/LaunchAgents/$(basename "$f")"
  cp "$f" "$dst"
  sed -i '' "s|__REPO_ROOT__|$REPO|g" "$dst"
done
```

### 2. Set `OPENAI_API_KEY`

Three agents (`resolve-predictions`, `freshness-review`, `triage-questions`) call the OpenAI API via the Vercel AI SDK. The key must be available in the launchd environment. The recommended approach keeps the key out of version control entirely:

```sh
launchctl setenv OPENAI_API_KEY <your-key>
```

This injects the variable into the launchd session; the plists inherit that environment without baking the key into any file. The setting persists until the next logout.

For persistence across reboots, add the `launchctl setenv` call to a login item or a separate `launchd` plist loaded at login — do not put the key in these agent plists or commit it to git.

The two non-LLM agents (`dormant-flip`, `review-decisions`) need no key.

The plists invoke `/bin/zsh -lc` and source `~/.zshrc` before running `pnpm`, so nvm/asdf-style local Node installs are available without hard-coding a machine-specific pnpm path.

### 3. Create the log directory

```sh
mkdir -p ~/Library/Logs/me
```

## Install

Bootstrap each copied plist into the GUI session (replace `<plist-path>` with the full path):

```sh
launchctl bootstrap gui/$(id -u) <plist-path>
```

Example for all five at once:

```sh
for f in ~/Library/LaunchAgents/com.tom.me.*.plist; do
  launchctl bootstrap gui/$(id -u) "$f"
done
```

## Verify

Kick off a plist immediately to confirm it runs cleanly:

```sh
launchctl kickstart -k gui/$(id -u)/com.tom.me.dormant-flip
```

Check the log:

```sh
tail ~/Library/Logs/me/dormant-flip.out.log
tail ~/Library/Logs/me/dormant-flip.err.log
```

## Uninstall

```sh
launchctl bootout gui/$(id -u)/com.tom.me.dormant-flip
# repeat for each label, or:
for label in dormant-flip review-decisions resolve-predictions freshness-review triage-questions; do
  launchctl bootout gui/$(id -u)/com.tom.me.$label 2>/dev/null || true
done
```

## Schedule summary

| Agent | Schedule | LLM |
|---|---|---|
| `dormant-flip` | Daily 03:00 | No |
| `review-decisions` | Daily 03:05 | No |
| `resolve-predictions` | Daily 03:10 | Yes |
| `freshness-review` | Weekly Sunday 03:15 | Yes |
| `triage-questions` | Every 30 minutes | Yes |

## Note on `review-proposals`

`pnpm review-proposals` is human-only and must never be scheduled. It blocks on TTY input. Run it manually whenever agents have enqueued proposals you want to review.
