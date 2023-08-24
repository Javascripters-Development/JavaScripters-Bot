import { sql, eq } from "drizzle-orm";
import db from "./db";
import { Config } from "./schemas/config";

/**
 * Casts a value into an array.
 *
 * @example
 * castArray(1) // [1]
 * castArray(['Hello', 'world']) // ['Hello', 'world']
 */
// rome-ignore lint/suspicious/noExplicitAny: can be an array of any type
export const castArray = <T>(value: T): T extends any[] ? T : T[] => {
	// rome-ignore lint/suspicious/noExplicitAny: can be an array of any type
	return (Array.isArray(value) ? value : [value]) as T extends any[] ? T : T[];
};

export const configPreparedStatement = db
	.select()
	.from(Config)
	.where(eq(Config.id, sql.placeholder("guildId")))
	.prepare();

export type ConfigRow = ReturnType<typeof configPreparedStatement["get"]>;
