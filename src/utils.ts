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

/**
 * Returns the config for a certain guild.
 *
 * @example
 * getConfig('1')
 */
export const getConfig = (guildId: string) =>
	db
		.select()
		.from(Config)
		.where(eq(Config.id, sql.placeholder("guildId")))
		.prepare()
		.get({ guildId });

export type ConfigRow = ReturnType<typeof getConfig>;
