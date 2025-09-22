import type { Context } from "elysia";
import {
	AppError,
	ValidationError,
	NotFoundError,
	ConflictError,
	DatabaseError,
} from "../types/errors";

export const errorHandler = (error: Error, ctx: Context) => {
	console.error("Error:", error);

	if (error instanceof ValidationError) {
		ctx.set.status = 400;
		return {
			error: "Validation Error",
			message: error.message,
			code: error.code,
		};
	}

	if (error instanceof NotFoundError) {
		ctx.set.status = 404;
		return {
			error: "Not Found",
			message: error.message,
			code: error.code,
		};
	}

	if (error instanceof ConflictError) {
		ctx.set.status = 409;
		return {
			error: "Conflict",
			message: error.message,
			code: error.code,
		};
	}

	if (error instanceof DatabaseError) {
		ctx.set.status = 500;
		return {
			error: "Database Error",
			message: error.message,
			code: error.code,
		};
	}

	if (error instanceof AppError) {
		ctx.set.status = error.statusCode;
		return {
			error: "Application Error",
			message: error.message,
			code: error.code,
		};
	}

	ctx.set.status = 500;
	return {
		error: "Internal Server Error",
		message: "An unexpected error occurred",
		code: "INTERNAL_ERROR",
	};
};
