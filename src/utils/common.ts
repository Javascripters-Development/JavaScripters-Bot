/**
 * Truncate text to a certain amount of characters.
 * @param text The text to truncate if it's too long.
 * @param maxCharacters The output's maximum length (inclusive)
 * @param ellipsis The character(s) to use as ellipsis.
 *
 * @example
 * truncate("Hello world!", 8) // 'Hello w…'
 * truncate("Hello world!", 8, "...") // 'Hello...'
 */
export function truncate(text: string, maxCharacters: number, ellipsis = "…") {
	return text.length <= maxCharacters
		? text
		: text.slice(0, maxCharacters - ellipsis.length) + ellipsis;
}
