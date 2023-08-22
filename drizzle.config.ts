import type { Config } from "drizzle-kit";

export default {
	schema: "src/schemas/*",
	dbCredentials: {
		url: "main.db",
	},
	out: "./migrations",
} satisfies Config;
