import type { Config } from "drizzle-kit";

export default {
	schema: "src/schemas/*",
	driver: "better-sqlite",
	dbCredentials: {
		url: "main.db",
	},
	out: "./migrations",
} satisfies Config;
