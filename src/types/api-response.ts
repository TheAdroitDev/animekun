import type { ApiResponseType } from "@/types/api";

export class ApiResponse {
  static ok<T>(data: T, message?: string) {
    return Response.json(
      {
        success: true,
        message,
        data,
      } satisfies ApiResponseType<T>, // `satisfies` checks that the object conforms to our API contract without trying to pass a type argument to Response.json().
      { status: 200 }
    );
  }

  static created<T>(data: T, message?: string) {
    return Response.json(
      {
        success: true,
        message,
        data,
      } satisfies ApiResponseType<T>,
      { status: 201 }
    );
  }

  static noContent() {
    return new Response(null, { status: 204 });
  }

  static badRequest(message = "Bad request") {
    return Response.json(
      {
        success: false,
        error: message,
      },
      { status: 400 }
    );
  }

  static unauthorized(message = "Unauthorized") {
    return Response.json(
      {
        success: false,
        error: message,
      },
      { status: 401 }
    );
  }

  static forbidden(message = "Forbidden") {
    return Response.json(
      {
        success: false,
        error: message,
      },
      { status: 403 }
    );
  }

  static notFound(message = "Not found") {
    return Response.json(
      {
        success: false,
        error: message,
      },
      { status: 404 }
    );
  }

  static conflict(message = "Conflict") {
    return Response.json(
      {
        success: false,
        error: message,
      },
      { status: 409 }
    );
  }

  static error(message = "Internal server error", status = 500) {
    return Response.json(
      {
        success: false,
        error: message,
      },
      { status }
    );
  }
}