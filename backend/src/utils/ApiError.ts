export default class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    Object.setPrototypeOf(this, ApiError.prototype);
  }

  static badRequest(msg: string) {
    return new ApiError(400, msg);
  }

  static notFound(msg: string) {
    return new ApiError(404, msg);
  }

  static unauthorized(msg: string) {
    return new ApiError(401, msg);
  }

  static forbidden(msg: string) {
    return new ApiError(403, msg);
  }

  static internal(msg: string) {
    return new ApiError(500, msg);
  }
}
