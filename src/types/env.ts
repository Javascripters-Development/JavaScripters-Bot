import { number, object, string, minValue, coerce, boolean, optional, picklist, transform } from "valibot";

const env = object({
	TOKEN: string(),
	GUILD: string(),
	CSE_KEY: string(),
	CSE_CSX: string(),
	SCRAPE_CACHE: optional(coerce(number([minValue(0,"Must not be negative")]), Number)),
	ORM_DEBUG: optional(transform(picklist(["true","false"],"Must be true or false"),(input)=>input==="true")),
	NODE_ENV: optional(picklist(["production","development"])),
	TZ: optional(string())
});
declare module "bun" {
	interface Env {
		TOKEN: string;
		GUILD: string;
		CSE_KEY: string;
		CSE_CSX: string;
		SCRAPE_CACHE?: number;
		ORM_DEBUG?: boolean;
	}
}
export default env;
