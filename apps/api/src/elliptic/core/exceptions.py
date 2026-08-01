"""Application exception hierarchy mapped to HTTP responses by handlers."""


class AppError(Exception):
    """Base application error carrying an HTTP status code and message."""

    status_code = 500

    def __init__(self, message: str = "Internal server error") -> None:
        self.message = message
        super().__init__(message)


class BadRequestError(AppError):
    """400 — the request is invalid."""

    status_code = 400

    def __init__(self, message: str = "Bad request") -> None:
        super().__init__(message)


class UnauthorizedError(AppError):
    """401 — authentication is missing or invalid."""

    status_code = 401

    def __init__(self, message: str = "Unauthorized") -> None:
        super().__init__(message)


class ForbiddenError(AppError):
    """403 — the caller lacks permission."""

    status_code = 403

    def __init__(self, message: str = "Forbidden") -> None:
        super().__init__(message)


class NotFoundError(AppError):
    """404 — the resource does not exist in the caller's scope."""

    status_code = 404

    def __init__(self, message: str = "Not found") -> None:
        super().__init__(message)


class ConflictError(AppError):
    """409 — the request conflicts with existing state."""

    status_code = 409

    def __init__(self, message: str = "Conflict") -> None:
        super().__init__(message)


class BadGatewayError(AppError):
    """502 — an upstream provider call failed."""

    status_code = 502

    def __init__(self, message: str = "Upstream provider error") -> None:
        super().__init__(message)
