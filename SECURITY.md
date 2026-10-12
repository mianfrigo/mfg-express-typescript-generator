# Security policy

## Supported versions

Security fixes go into the latest release of the current major version.

| Version | Supported |
|---|---|
| 2.x (latest) | yes |
| 1.x | no (deprecated, please upgrade) |

## Reporting a vulnerability

Please **do not open a public issue** for a security problem.

Report it privately with GitHub's security advisories:
<https://github.com/mianfrigo/mfg-express-typescript-generator/security/advisories/new>

Include what you found, the generator version (`npx @mianfrigo/express-typescript-generator --version`), the flags you used, and the smallest way to reproduce it.

## What counts

This package generates code, so two things matter:

- **The generated application.** A flaw in what the templates produce (for example an authentication bypass, a leaked secret or an injection) is in scope, because it ships into other people's projects.
- **The generator itself**, including its publish pipeline.

Not in scope: vulnerabilities in a dependency that are already reported upstream and have no exploitable path in generated code, and issues that require editing the generated code first.

## What to expect

You will get an acknowledgement, a fix or a clear explanation, and credit in the changelog if you want it. Releases are published from CI with npm provenance, so you can verify that a published version was built from this repository.
