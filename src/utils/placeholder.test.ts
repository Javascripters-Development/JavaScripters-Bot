import { describe, it, expect } from "bun:test";
import { findPlaceholders, replacePlaceholders } from "./placeholder.ts";

describe("Utils - Placeholder", () => {
	describe(`${findPlaceholders.name}()`, () => {
		it.each([
			["Hello, [name]!", [["name", 7, 12]]],
			// biome-ignore format: more readable when inline
			["Hello, [yourName]! I'm [myName].", [["yourName", 7, 16], ["myName", 23, 30]]],
			// biome-ignore format: more readable when inline
			["Hello, [[yourName]! I'm [myName]].",[["yourName", 8, 17],["myName", 24, 31]]],
		] as [string, [string, number, number][]][])(
			'Should find the placeholders for the string "%s"',
			(text, expected) => {
				const actual = findPlaceholders(text);

				expect(actual).toEqual(expected);
			},
		);

		it("Should not find any placeholders when none are present", () => {
			const actual = findPlaceholders("Hello you!");

			expect(actual).toEqual([]);
		});

		it("Should only find the deepest nested placeholder", () => {
			const actual = findPlaceholders("Hello [te[name]xt]!");

			expect(actual).toEqual([["name", 9, 14]]);
		});

		it.each([
			["Hello, [[name]]!", []],
			["Hello, [yourName]! I'm [[myName]].", [["yourName", 7, 16]]],
			["Hello, [your:name]! I'm [[myName]].", []],
		] as [string, [string, number, number][]][])(
			'Should ignore invalid placeholders for the string "%s"',
			(text, expected) => {
				const actual = findPlaceholders(text);

				expect(actual).toEqual(expected);
			},
		);
	});

	describe(`${replacePlaceholders.name}()`, () => {
		it.each([
			["Hello, [name]!", { name: "you" }, "Hello, you!"],
			["Hello, [yourName]! I'm [myName]", { yourName: "you", myName: "me" }, "Hello, you! I'm me"],
		])('Should replace the placeholders for the string "%s"', (text, placeholderMap, expected) => {
			const actual = replacePlaceholders(text, placeholderMap);

			expect(actual).toBe(expected);
		});

		it("Should not replace any placeholders when none are present", () => {
			const actual = replacePlaceholders("Hello you!", { name: "you" });

			expect(actual).toBe("Hello you!");
		});

		it("Should only find the deepest nested placeholder", () => {
			const actual = replacePlaceholders("Hello [te[name]xt]!", { name: "you" });

			expect(actual).toBe("Hello [teyouxt]!");
		});

		it.each([
			["Hello, [[name]]!", { name: "you" }, "Hello, [[name]]!"],
			["Hello, [yourName]! I'm [[myName]].", { yourName: "you", myName: "me" }, "Hello, you! I'm [[myName]]."],
			// biome-ignore format: more readable when inline
			["Hello, [your:name]! I'm [[myName]].", { 'your:name': "you", myName: "me" }, "Hello, [your:name]! I'm [[myName]]."],
		])('Should ignore invalid placeholders for the string "%s"', (text, placeholderMap, expected) => {
			const actual = replacePlaceholders(text, placeholderMap);

			expect(actual).toBe(expected);
		});
	});
});
