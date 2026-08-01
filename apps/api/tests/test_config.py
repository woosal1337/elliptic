"""Settings validation tests for production secret guards."""

import pytest

from elliptic.core.config import INSECURE_DEV_SECRET, Settings

VALID_KEK = "MDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDA="
STRONG_SECRET = "a-strong-production-secret-with-enough-length"


def test_production_rejects_dev_jwt_secret() -> None:
    with pytest.raises(ValueError, match="JWT_SECRET_KEY"):
        Settings(env="production", jwt_secret_key=INSECURE_DEV_SECRET, elliptic_kek=VALID_KEK)


def test_production_rejects_empty_jwt_secret() -> None:
    with pytest.raises(ValueError, match="JWT_SECRET_KEY"):
        Settings(env="production", jwt_secret_key="", elliptic_kek=VALID_KEK)


def test_production_requires_kek() -> None:
    with pytest.raises(ValueError, match="ELLIPTIC_KEK"):
        Settings(env="production", jwt_secret_key=STRONG_SECRET, elliptic_kek="")


def test_production_rejects_wrong_length_kek() -> None:
    with pytest.raises(ValueError, match="32 bytes"):
        Settings(env="production", jwt_secret_key=STRONG_SECRET, elliptic_kek="c2hvcnQ=")


def test_production_accepts_strong_secrets() -> None:
    settings = Settings(env="production", jwt_secret_key=STRONG_SECRET, elliptic_kek=VALID_KEK)
    assert settings.env == "production"
    assert settings.jwt_secret_key == STRONG_SECRET


def test_development_keeps_dev_defaults() -> None:
    settings = Settings(env="development", jwt_secret_key=INSECURE_DEV_SECRET, elliptic_kek="")
    assert settings.env == "development"
    assert settings.jwt_secret_key == INSECURE_DEV_SECRET


def test_production_rejects_wildcard_cors() -> None:
    with pytest.raises(ValueError, match="CORS_ORIGINS"):
        Settings(
            env="production",
            jwt_secret_key=STRONG_SECRET,
            elliptic_kek=VALID_KEK,
            cors_origins="*",
        )
