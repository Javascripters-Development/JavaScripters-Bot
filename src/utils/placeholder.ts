const START_DELIMITER = "[";
const END_DELIMITER = "]";

/** Check if a character is part of the latin alphabet. */
const isLatinLetter = (character: string) => character.toUpperCase() !== character.toLowerCase();

/**
 * Find all placeholders in a string.
 *
 * @example
 * findPlaceholders('Hello [name]!') // [["name", 6, 11]]
 *
 * @example <caption>With escaped delimiters</caption>
 * findPlaceholders('Hello [[name]]!') // []
 */
export const findPlaceholders = (text: string) => {
	/**
	 * The placeholders mapped as the following nested array structure:\
	 * `0`: placeholder name\
	 * `1`: offset of the placeholder start delimiter\
	 * `2`: offset of the placeholder end delimiter
	 */
	const placeholderMap: [string, number, number][] = [];

	let placeholderStarted = false;
	let isEscaped = false;
	let delimiterStartOffset = -1;
	let buffer = "";

	const resetState = () => {
		placeholderStarted = false;
		isEscaped = false;
		delimiterStartOffset = -1;
		buffer = "";
	};

	for (let i = 0; i < text.length; i++) {
		const nextCharacter = text[i + 1];
		const currentCharacter = text[i];
		const previousCharacter = text[i - 1];

		// Reset state when nested delimiters exist
		if (placeholderStarted && currentCharacter === START_DELIMITER) resetState();

		// Placeholder starts
		if (currentCharacter === START_DELIMITER && nextCharacter !== START_DELIMITER) {
			if (previousCharacter === START_DELIMITER) isEscaped = true;

			delimiterStartOffset = i;
			placeholderStarted = true;
			continue;
		}

		// Placeholder ends
		if (buffer && currentCharacter === END_DELIMITER) {
			// Escaped placeholders should not be processed
			if (isEscaped && nextCharacter === END_DELIMITER) {
				resetState();
				continue;
			}

			placeholderMap.push([buffer, delimiterStartOffset, i]);
			resetState();
			continue;
		}

		if (placeholderStarted) {
			// Non alphabetic character
			if (!isLatinLetter(currentCharacter)) {
				resetState();
				continue;
			}

			// Normal character (placeholder name)
			buffer += currentCharacter;
		}
	}

	return placeholderMap;
};
