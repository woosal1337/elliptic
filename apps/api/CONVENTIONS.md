# Conventions

These rules are binding for every change in this repository.

## Comments

- No explanatory inline comments. Code must be self-describing.
- Only functional pragmas are allowed (`# noqa: <code>`, `# type: ignore[<code>]`) and only when truly needed.
- Every module has a one-line docstring. Public service functions have docstrings.

## Multi-tenancy

- Every tenant-owned table carries `org_id`.
- Every query over tenant data goes through a service that requires an `OrgContext`.
- No route handler may touch tenant data without the org-membership dependency (`get_org_context` / `require_role`).
- Reads are tenant-parameterized only. No global list endpoints over tenant data.
- Cross-org access returns 404, never leaking resource existence.

## Secrets

- BYOK provider keys are encrypted with AES-256-GCM under the KEK from `ELLIPTIC_KEK` (32-byte urlsafe base64). Ciphertext and nonce are stored; plaintext only exists in memory inside the request that uses it.
- API responses expose only `provider`, `name`, `last4`, `is_default`, `created_at`. Never ciphertext, never plaintext.
- Never log key material, Authorization headers, or provider error bodies verbatim.

## Layering

- `router.py` is HTTP only: parse input, call service, shape envelope.
- `service.py` owns business logic, transactions, and activity recording.
- Models stay in the module's `models.py`; cross-module imports go through the module's public names only.
- Every mutation records an `ActivityEvent` via `record_activity`.

## Responses and errors

- All endpoints return the `{success, message, data}` envelope (`SuccessResponse` / `ErrorResponse`).
- Raise the custom exception hierarchy (`BadRequestError`, `UnauthorizedError`, `ForbiddenError`, `NotFoundError`, `ConflictError`); handlers map them to the envelope.

## Commands gate

Before any merge, all of these must pass:

```bash
uv run ruff format . && uv run ruff check .
uv run mypy src/
uv run alembic upgrade head
uv run pytest -q
```

`make all` runs the local equivalent.

## Known limitations / v1.1

- Refresh tokens are not revocable. Tokens carry a `jti` claim, but there is no
  server-side `jti` store, so logout only clears the auth cookies and any
  outstanding refresh token remains valid until it expires. A `jti`
  revocation/denylist store is tracked for v1.1.
