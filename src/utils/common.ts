/**
 * Truncate text to a certain amount of characters.
 *
 * @example
 * truncate('Hello world!', 8) // 'Hello...'
 */
export const truncate = (text: string, maxCharacters: number) => {
	if (text.length < maxCharacters) return text;

	const ellipsis = "...";

	return text.slice(0, maxCharacters - ellipsis.length) + ellipsis;
};

/** Represents time in milliseconds. */
export enum Time {
	Second = 1000,
	Minute = Second * 60,
	Hour = Minute * 60,
	Day = Hour * 24,
	Week = Day * 7,
	Month = Day * (365 / 12),
	Year = Day * 365,
}
