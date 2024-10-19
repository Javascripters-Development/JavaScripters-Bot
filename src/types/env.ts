import {
	number,
	object,
	string,
	minValue,
	coerce,
	optional,
	picklist,
	transform,
} from "valibot";

const env = object({
	TOKEN: string(),
	GUILD: string(),
	MDN_INDEX_REFRESH: optional(
		coerce(number([minValue(1, "Must be at least 1")]), Number),
	),
	SCRAPE_CACHE_LIFETIME: optional(
		coerce(number([minValue(0, "Must not be negative")]), Number),
	),
	ORM_DEBUG: optional(
		transform(
			picklist(["true", "false"], "Must be true or false"),
			(input) => input === "true",
		),
	),
	NODE_ENV: optional(picklist(["production", "development"])),
	TZ: optional(string()),
});
declare module "bun" {
	interface Env {
		TOKEN: string;
		GUILD: string;
		SCRAPE_CACHE_LIFETIME?: number;
		ORM_DEBUG?: boolean;
		MDN_INDEX_REFRESH?: number;
	}
}
export default env;
