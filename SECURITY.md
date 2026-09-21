# POSSARA Security Policy

POSSARA treats security and privacy reports as priority issues.

## Reporting a vulnerability

Please do not publish exploit details, credentials, personal data, or proof-of-concept attacks in a public issue.

Report the issue privately to the repository owner through GitHub, with:

- the affected POSSARA surface or URL;
- the security impact;
- reproducible steps using test data only;
- screenshots or logs with secrets and personal data removed;
- any suggested remediation.

The maintainer will acknowledge, triage, remediate, verify, and disclose confirmed issues responsibly. Critical issues should be handled before public disclosure.

## Security expectations

POSSARA uses server-side authorization, Supabase Row Level Security, private storage for sensitive uploads, least-privilege Edge Functions, rate limiting, secure browser headers, and audited release validation. Security controls are reviewed continuously and are not treated as a one-time certification.

## Scope

Good-faith testing should avoid:

- denial-of-service or destructive load testing against production;
- accessing or changing another person's real data;
- social engineering, phishing, credential stuffing, or spam;
- uploading malware or unlawful content;
- disrupting production availability.

Use test accounts and the minimum activity required to demonstrate an issue.

## Supported version

Only the current production release on the main branch is supported for security fixes.
