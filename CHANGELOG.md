# Changelog

## 0.2.0 — 2026-10-08

- Preflight, with a parachute: `preflight(input)` returns the same score, verdict and reasons as `shipIt`, plus actionable `actions`. CLI `--checklist` includes them in text or JSON output. It uses only supplied evidence and is not a deployment guarantee.
- Add npm and CI badges to the published README.

## 0.1.1 — 2026-10-08

- Correct npm installation and npx documentation after the initial publication.
- Add a searchable, humorous package description and relevant npm keywords.
- No API, CLI behavior, or dependency changes.

## 0.1.0 — 2026-10-08

- Deterministic readiness score with explanations and technical blocker caps.
- CLI, documented scoring rules, tests, linting, formatting, and Node 22/24 CI.
