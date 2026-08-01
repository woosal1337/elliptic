"""Exception handlers mapping application errors to the response envelope."""

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from loguru import logger
from starlette.exceptions import HTTPException as StarletteHTTPException

from elliptic.core.exceptions import AppError
from elliptic.core.schemas import ErrorResponse


def _envelope(status_code: int, message: str) -> JSONResponse:
    return JSONResponse(
        status_code=status_code, content=ErrorResponse(message=message).model_dump()
    )


async def app_error_handler(_request: Request, exc: Exception) -> JSONResponse:
    """Map AppError subclasses to their status code with the error envelope."""
    if not isinstance(exc, AppError):
        raise exc
    return _envelope(exc.status_code, exc.message)


async def validation_error_handler(_request: Request, exc: Exception) -> JSONResponse:
    """Map request validation failures to a 422 envelope."""
    if not isinstance(exc, RequestValidationError):
        raise exc
    detail = "; ".join(
        f"{'.'.join(str(part) for part in err.get('loc', []))}: {err.get('msg', 'invalid')}"
        for err in exc.errors()
    )
    return _envelope(status.HTTP_422_UNPROCESSABLE_CONTENT, f"Validation error: {detail}")


async def http_exception_handler(_request: Request, exc: Exception) -> JSONResponse:
    """Map framework HTTP exceptions to the error envelope."""
    if not isinstance(exc, StarletteHTTPException):
        raise exc
    return _envelope(exc.status_code, str(exc.detail))


async def unhandled_error_handler(request: Request, _exc: Exception) -> JSONResponse:
    """Map unexpected exceptions to a generic 500 envelope."""
    logger.exception("Unhandled error on {} {}", request.method, request.url.path)
    return _envelope(status.HTTP_500_INTERNAL_SERVER_ERROR, "Internal server error")


def register_handlers(app: FastAPI) -> None:
    """Attach all exception handlers to the application."""
    app.add_exception_handler(AppError, app_error_handler)
    app.add_exception_handler(RequestValidationError, validation_error_handler)
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)
    app.add_exception_handler(Exception, unhandled_error_handler)
