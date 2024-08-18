import { describe, it, expect } from "vitest";
import { findPlaceholders } from "./placeholder.ts";

describe("Utils - Placeholder", () => {
	describe(`${findPlaceholders.name}()`, () => {
		it.each([
			["Hello, [name]!", [["name", 7, 12]]],
			// biome-ignore format: more readable when inline
			["Hello, [yourName]! I'm [myName].", [["yourName", 7, 16], ["myName", 23, 30]]],
			// biome-ignore format: more readable when inline
			["Hello, [[yourName]! I'm [myName]].",[["yourName", 8, 17],["myName", 24, 31]]],
		])('Should find the placeholders for the string "%s"', (text, expected) => {
			const actual = findPlaceholders(text);

			expect(actual).toEqual(expected);
		});

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
		])('Should ignore escaped placeholders for the string "%s"', (text, expected) => {
			const actual = findPlaceholders(text);

			expect(actual).toEqual(expected);
		});
	});
});
