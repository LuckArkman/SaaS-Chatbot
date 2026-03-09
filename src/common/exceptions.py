from typing import Any, Dict, Optional

class AppException(Exception):
    """Base exception for the application."""
    def __init__(
        self, 
        message: str, 
        code: int = 500, 
        status_code: int = 500,
        payload: Optional[Dict[str, Any]] = None
    ):
        self.message = message
        self.code = code
        self.status_code = status_code
        self.payload = payload
        super().__init__(message)

class ValidationException(AppException):
    """Exception for validation errors (400)."""
    def __init__(self, message: str, code: int = 400, payload: Optional[Dict[str, Any]] = None):
        super().__init__(message, code=code, status_code=400, payload=payload)

class NotFoundException(AppException):
    """Exception when a resource is not found (404)."""
    def __init__(self, message: str, code: int = 404):
        super().__init__(message, code=code, status_code=404)

class UnauthorizedException(AppException):
    """Exception for auth failures (401)."""
    def __init__(self, message: str = "Unauthorized", code: int = 401):
        super().__init__(message, code=code, status_code=401)

class ForbiddenException(AppException):
    """Exception for permission failures (403)."""
    def __init__(self, message: str = "Forbidden", code: int = 403):
        super().__init__(message, code=code, status_code=403)
