import { sql } from "drizzle-orm";
import { customType } from "drizzle-orm/sqlite-core";

export const stringSet = customType<{
	data: Set<string>;
	driverData: string;
	default: true;
}>({
	dataType() {
		return "stringSet";
	},
	toDriver(value: Set<string>) {
		return value.size ? [...value].join(",") : sql`NULL`;
	},
	fromDriver(value: string): Set<string> {
		return new Set(value ? value.split(",") : []);
	},
});
