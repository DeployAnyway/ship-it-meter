# Contributing

Welcome to DeployAnyway: tools for developers who probably know better. Keep the core independently useful, offline, and workplace-safe. Use Node 22.13+ or 24, npm ci and a feature branch.

Source lives in src/; CLI orchestration is measured alongside the API. Add meaningful behavior and failure tests. Run npm run build, npm run format, npm run lint, npm run format:check, npm run coverage, npm run test:types, npm run verify:package and npm audit.

Coverage gates: 90% statements/lines/functions and 85% branches. Archive checks install a temporary local tarball and never publish. Document API/output changes and show a concrete use case in your PR. See CODE_OF_CONDUCT.md and SECURITY.md. Release candidates require explicit publication approval.
