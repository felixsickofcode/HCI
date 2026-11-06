class AppError(Exception):
    status_code = 400
    message = "Application error"

    def __init__(self, message: str | None = None):
        self.message = message or self.message
        super().__init__(self.message)


class NotFoundError(AppError):
    status_code = 404
    message = "Resource not found"


class ConflictError(AppError):
    status_code = 409
    message = "Resource conflict"


class UserNotFoundError(NotFoundError):
    message = "User not found"


class EmailAlreadyExistsError(ConflictError):
    message = "Email already registered"

class DisplaySettingsNotFoundError(NotFoundError):
    message = "Display settings not saved yet"