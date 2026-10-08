# Contributing

Welcome! Keep scoring deterministic, explainable, and small.

Use Node 22.13+ or 24 and run `npm ci` on a feature branch. Scoring lives in
`src/index.js`. Any scoring change must update the README rules, changelog, and
tests for boundaries and monotonic behavior. Discuss algorithm changes in an
issue first. Humor should never outweigh technical blockers.

Before opening a PR:

```sh
npm run format
npm run lint
npm run format:check
npm test
npm pack --dry-run
```
