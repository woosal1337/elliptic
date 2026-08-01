"""AES-256-GCM encryption helpers for BYOK provider keys."""

import os

from cryptography.exceptions import InvalidTag
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from elliptic.core.exceptions import BadRequestError

NONCE_SIZE = 12
LAST4_LENGTH = 4


def encrypt_secret(plaintext: str, kek: bytes, aad: bytes | None = None) -> tuple[bytes, bytes]:
    """Encrypt a secret, returning (nonce, ciphertext) with a fresh random nonce."""
    nonce = os.urandom(NONCE_SIZE)
    ciphertext = AESGCM(kek).encrypt(nonce, plaintext.encode(), aad)
    return nonce, ciphertext


def decrypt_secret(nonce: bytes, ciphertext: bytes, kek: bytes, aad: bytes | None = None) -> str:
    """Decrypt a stored secret, failing closed on any authentication mismatch."""
    try:
        return AESGCM(kek).decrypt(nonce, ciphertext, aad).decode()
    except InvalidTag as exc:
        raise BadRequestError("Stored key cannot be decrypted") from exc


def last4(secret: str) -> str:
    """Return the last four characters of a secret for masked display."""
    return secret[-LAST4_LENGTH:] if len(secret) >= LAST4_LENGTH else secret
