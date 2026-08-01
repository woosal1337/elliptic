"""Shared rate limiter for abuse-prone public endpoints (disabled under tests)."""

from slowapi import Limiter
from slowapi.util import get_remote_address

from elliptic.core.config import get_settings

limiter = Limiter(key_func=get_remote_address, enabled=get_settings().env != "test")
