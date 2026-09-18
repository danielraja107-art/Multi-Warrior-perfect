export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }

  static badRequest(code: string, message: string): ApiError {
    return new ApiError(400, code, message);
  }

  static unauthorized(code = 'UNAUTHORIZED', message = 'Authentication required.'): ApiError {
    return new ApiError(401, code, message);
  }

  static forbidden(code = 'FORBIDDEN', message = 'You do not have permission.'): ApiError {
    return new ApiError(403, code, message);
  }

  static notFound(code = 'NOT_FOUND', message = 'Resource not found.'): ApiError {
    return new ApiError(404, code, message);
  }

  static conflict(code: string, message: string): ApiError {
    return new ApiError(409, code, message);
  }

  static tooMany(code = 'RATE_LIMITED', message = 'Too many requests.'): ApiError {
    return new ApiError(429, code, message);
  }
}
