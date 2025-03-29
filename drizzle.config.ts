import type { Config } from "drizzle-kit";

export default {
	schema: "src/schemas/*",
	dialect: "sqlite",
	dbCredentials: {
		url: "main.db",
	},
	out: "./migrations",
} satisfies Config;
