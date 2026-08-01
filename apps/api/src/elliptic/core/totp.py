"""RFC 6238 TOTP (time-based one-time password) using only the stdlib (COS-214)."""

import base64
import hashlib
import hmac
import secrets
import struct
import time
from urllib.parse import quote

_DIGITS = 6
_PERIOD = 30


def generate_secret() -> str:
    """A random base32 TOTP secret (160 bits)."""
    return base64.b32encode(secrets.token_bytes(20)).decode("ascii").rstrip("=")


def _hotp(secret: str, counter: int) -> str:
    key = base64.b32decode(secret + "=" * (-len(secret) % 8), casefold=True)
    digest = hmac.new(key, struct.pack(">Q", counter), hashlib.sha1).digest()
    offset = digest[-1] & 0x0F
    code = (struct.unpack(">I", digest[offset : offset + 4])[0] & 0x7FFFFFFF) % (10**_DIGITS)
    return str(code).zfill(_DIGITS)


def now_code(secret: str, at: float | None = None) -> str:
    """The current TOTP code for a secret."""
    moment = int((at if at is not None else time.time()) // _PERIOD)
    return _hotp(secret, moment)


def verify(secret: str, code: str, at: float | None = None, window: int = 1) -> bool:
    """Verify a code, tolerating +/- ``window`` periods of clock drift."""
    code = code.strip().replace(" ", "")
    if not code.isdigit():
        return False
    moment = int((at if at is not None else time.time()) // _PERIOD)
    return any(
        hmac.compare_digest(_hotp(secret, moment + drift), code)
        for drift in range(-window, window + 1)
    )


def provisioning_uri(secret: str, account: str, issuer: str = "CompanyOS") -> str:
    """An otpauth:// URI for authenticator-app enrollment (QR)."""
    label = quote(f"{issuer}:{account}")
    return (
        f"otpauth://totp/{label}?secret={secret}"
        f"&issuer={quote(issuer)}&algorithm=SHA1&digits={_DIGITS}&period={_PERIOD}"
    )
