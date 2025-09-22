import z from "zod";

const envSchema = z.object({
	COUCH_URL: z.url("Invalid CouchDB URL format"),
	COUCH_DB_NAME: z.string().min(1, "CouchDB database name is required"),
	PORT: z.string().transform(Number).pipe(z.number().int().positive()),
	NODE_ENV: z
		.enum(["development", "production", "test"])
		.default("development"),
});

export const env = envSchema.parse(process.env);
