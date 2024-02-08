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
