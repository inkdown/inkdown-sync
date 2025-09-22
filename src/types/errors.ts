export class AppError extends Error {
	constructor(
		public message: string,
		public statusCode: number = 500,
		public code?: string,
	) {
		super(message);
		this.name = this.constructor.name;
		Error.captureStackTrace(this, this.constructor);
	}
}

export class ValidationError extends AppError {
	constructor(message: string) {
		super(message, 400, "VALIDATION_ERROR");
	}
}

export class NotFoundError extends AppError {
	constructor(message: string) {
		super(message, 404, "NOT_FOUND");
	}
}

export class ConflictError extends AppError {
	constructor(message: string) {
		super(message, 409, "CONFLICT");
	}
}

export class DatabaseError extends AppError {
	constructor(message: string) {
		super(message, 500, "DATABASE_ERROR");
	}
}
