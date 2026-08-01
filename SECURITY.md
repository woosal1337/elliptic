# Security Policy

## Reporting a vulnerability

Please report security vulnerabilities **privately**. Do not open a public issue,
pull request, or discussion for anything security-sensitive.

Use GitHub's private reporting: open the **Security** tab of this repository and
click **Report a vulnerability** to start a private advisory visible only to the
maintainers.

When you can, include:

- A description of the issue and its impact.
- Steps to reproduce, or a proof of concept.
- The affected version, commit, or endpoint.
- Any suggested remediation.

We will acknowledge your report, work with you on a fix, and credit you in the
advisory unless you prefer to stay anonymous. Please give us a reasonable window
to ship a fix before any public disclosure.

## Supported versions

Elliptic ships from `main`. Security fixes land on `main` and in the latest
tagged release, so self-hosters should track the latest release.

## A note on secrets

Elliptic is bring-your-own-key: API keys and provider credentials are supplied
per deployment and are never committed to this repository. The `.env.example`
files contain placeholders only. If you ever find a real credential, key, or
token committed anywhere in the tree, please report it through the private
channel above.
