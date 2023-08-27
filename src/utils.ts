import { hyperlink as djsHyperlink, hideLinkEmbed } from "discord.js";
import db from "./db.ts";
import { Config } from "./schemas/config.ts";
import { sql, eq } from "drizzle-orm";
/**
 * Casts a value into an array.
 *
 * @example
 * castArray(1) // [1]
 * castArray(['Hello', 'world']) // ['Hello', 'world']
 */
// biome-ignore lint/suspicious/noExplicitAny: can be an array of any type
export const castArray = <T>(value: T): T extends any[] ? T : T[] => {
	// biome-ignore lint/suspicious/noExplicitAny: can be an array of any type
	return (Array.isArray(value) ? value : [value]) as T extends any[] ? T : T[];
};

export const getConfig = db
	.select()
	.from(Config)
	.where(eq(Config.id, sql.placeholder("guildId")))
	.prepare();

// TEMP: use .all() and select the first row manually, .get() does not work
getConfig.get = (placeholderValues?: Record<string, unknown> | undefined) => {
	return getConfig.all(placeholderValues)[0];
};

/**
 * Formats the content and the URL into a masked URL without embed.
 * @see {@link djsHyperlink}.
 */
export const hyperlink = <C extends string, U extends string>(
	content: C,
	url: U,
) => djsHyperlink(content, hideLinkEmbed(url));

/**
 * Capitalizes the first letter of a string.
 *
 * @example
 * capitalizeFirstLetter('hello world') // "Hello world"
 */
export const capitalizeFirstLetter = <T extends string>(
	value: T,
): Capitalize<T> => (value[0].toUpperCase() + value.slice(1)) as Capitalize<T>;

/**
 * Utility for human readable time values.
 *
 * @example
 * setTimeout(() => {}, Time.Hour * 2) // 2 hour timer
 * setTimeout(() => {}, Time.Day) // 1 day timer
 */
export enum Time {
	Second = 1000,
	Minute = Time.Second * 60,
	Hour = Time.Minute * 60,
	Day = Time.Hour * 24,
	Week = Time.Day * 7,
	Year = Time.Day * 365,
	Month = Time.Year / 12,
}
