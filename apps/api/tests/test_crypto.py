"""Unit tests for AES-256-GCM secret encryption."""

import pytest

from elliptic.core.crypto import decrypt_secret, encrypt_secret, last4
from elliptic.core.exceptions import BadRequestError

KEK = b"0" * 32


def test_encrypt_decrypt_roundtrip() -> None:
    nonce, ciphertext = encrypt_secret("sk-super-secret-key", KEK, b"org-1")
    assert ciphertext != b"sk-super-secret-key"
    assert decrypt_secret(nonce, ciphertext, KEK, b"org-1") == "sk-super-secret-key"


def test_nonce_is_unique_per_encryption() -> None:
    nonce_a, cipher_a = encrypt_secret("same-secret", KEK)
    nonce_b, cipher_b = encrypt_secret("same-secret", KEK)
    assert nonce_a != nonce_b
    assert cipher_a != cipher_b


def test_aad_mismatch_fails_closed() -> None:
    nonce, ciphertext = encrypt_secret("sk-secret", KEK, b"org-1")
    with pytest.raises(BadRequestError):
        decrypt_secret(nonce, ciphertext, KEK, b"org-2")


def test_wrong_kek_fails_closed() -> None:
    nonce, ciphertext = encrypt_secret("sk-secret", KEK)
    with pytest.raises(BadRequestError):
        decrypt_secret(nonce, ciphertext, b"1" * 32)


def test_last4() -> None:
    assert last4("sk-abcd1234") == "1234"
    assert last4("ab") == "ab"
