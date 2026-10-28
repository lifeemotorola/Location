// A single error type carried through the API so responses stay consistent.
export class ApiError extends Error {
    constructor(status, code, message, details = undefined) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.code = code;
        this.details = details;
    }

    static badRequest(message, details) {
        return new ApiError(400, 'bad_request', message, details);
    }

    static unauthorized(message = 'Sign in to continue.') {
        return new ApiError(401, 'unauthorized', message);
    }

    static forbidden(message = 'You do not have access to this action.') {
        return new ApiError(403, 'forbidden', message);
    }

    static notFound(message = 'Not found.') {
        return new ApiError(404, 'not_found', message);
    }

    static conflict(message, details) {
        return new ApiError(409, 'conflict', message, details);
    }

    static tooMany(message = 'Too many requests. Try again shortly.') {
        return new ApiError(429, 'rate_limited', message);
    }

    static server(message = 'Unexpected server error.') {
        return new ApiError(500, 'server_error', message);
    }

    static validation(details) {
        return new ApiError(422, 'validation_failed', 'Some fields need attention.', details);
    }
}
