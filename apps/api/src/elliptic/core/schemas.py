"""Shared response envelope models."""

from pydantic import BaseModel


class SuccessResponse[T](BaseModel):
    """Standard success envelope wrapping every API payload."""

    success: bool = True
    message: str = "OK"
    data: T | None = None


class ErrorResponse(BaseModel):
    """Standard error envelope produced by exception handlers."""

    success: bool = False
    message: str
    data: None = None


def ok[T](data: T, message: str = "OK") -> SuccessResponse[T]:
    """Wrap a payload in the success envelope."""
    return SuccessResponse[T](success=True, message=message, data=data)
