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



class UnsupportedFileTypeError(AppError):
    status_code = 415
    message = "Unsupported file type. Only PDF, PNG, JPEG and WebP are accepted"


class FileTooLargeError(AppError):
    status_code = 413
    message = "File is too large"


class TextExtractionError(AppError):
    status_code = 422
    message = "Could not extract text from the file"


class OcrUnavailableError(AppError):
    status_code = 503
    message = "OCR is not available on the server"

class InvalidRequestError(AppError):
    status_code = 422
    message = "Invalid request"


class PayloadTooLargeError(AppError):
    status_code = 413
    message = "Payload is too large"


class SummaryUnavailableError(AppError):
    status_code = 422
    message = "Not enough content to summarize"


class LLMUnavailableError(AppError):
    status_code = 503
    message = "LLM summarization is not available on the server"

class AssistInputError(AppError):
    status_code = 422
    message = "Vùng chọn không hợp lệ"


class AssistTooLargeError(AppError):
    status_code = 413
    message = "Đoạn văn hoặc cụm từ quá dài"


class AssistRateLimitError(AppError):
    status_code = 429
    message = "Đã hết lượt giải nghĩa trong giờ này"


class AssistProviderError(AppError):
    status_code = 502
    message = "Dịch vụ giải nghĩa trả về kết quả không hợp lệ"


class AssistUnavailableError(AppError):
    status_code = 503
    message = "Dịch vụ giải nghĩa chưa sẵn sàng"


class AssistTimeoutError(AppError):
    status_code = 504
    message = "Dịch vụ giải nghĩa phản hồi quá lâu"
