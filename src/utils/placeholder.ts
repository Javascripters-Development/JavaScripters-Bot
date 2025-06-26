const START_DELIMITER = "[";
const END_DELIMITER = "]";

/** Check if a character is part of the latin alphabet. */
const isLatinLetter = (character: string) => character.toUpperCase() !== character.toLowerCase();

/** Replace a certain character range inside a string with another string. */
const replaceInString = (input: string, replaceWith: string, startOffset: number, endOffset: number) => {
	return input.substring(0, startOffset) + replaceWith + input.substring(endOffset);
};

interface PlaceholderReplaceHookContext {
	/** The offset of the placeholder start delimiter. */
	startOffset: number;
	/** The offset of the placeholder end delimiter. */
	endOffset: number;
	/** The placeholder name. */
	name: string;
}

/** The hook that replaces the placeholder or does nothing with it. */
type PlaceholderReplaceHook = (context: PlaceholderReplaceHookContext) => string | null;

/** Iterate over all placeholder values and replace with the result of the hook (or ignore if `null`). */
const placeholderIterateExecute = (text: string, hook: PlaceholderReplaceHook) => {
	let placeholderStarted = false;
	let isEscaped = false;
	let delimiterStartOffset = -1;
	let buffer = "";
	let finalText = text;

	const resetState = () => {
		placeholderStarted = false;
		isEscaped = false;
		delimiterStartOffset = -1;
		buffer = "";
	};

	for (let i = 0; i < finalText.length; i++) {
		const nextCharacter = finalText[i + 1];
		const currentCharacter = finalText[i];
		const previousCharacter = finalText[i - 1];

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

			const placeholderValue = hook({ startOffset: delimiterStartOffset, endOffset: i, name: buffer });

			// Replace the placeholder
			if (placeholderValue !== null) {
				finalText = replaceInString(finalText, placeholderValue, delimiterStartOffset, i + 1);

				// Replacing a placeholder causes the character positions to shift, so we need to fix these
				i = delimiterStartOffset + placeholderValue.length;
			}

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

	return finalText;
};

/** Replace placeholders in a string. */
export const replacePlaceholders = (text: string, placeholderMapping: Record<string, string>) => {
	const finalText = placeholderIterateExecute(text, ({ name }) => {
		if (!(name in placeholderMapping)) return null;

		return placeholderMapping[name];
	});

	return finalText;
};

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

	placeholderIterateExecute(text, ({ name, startOffset, endOffset }) => {
		placeholderMap.push([name, startOffset, endOffset]);

		return null;
	});

	return placeholderMap;
};
