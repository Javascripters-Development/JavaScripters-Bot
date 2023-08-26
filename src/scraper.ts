import { load, type CheerioAPI } from "cheerio";
import decodeEntities from "entities-decode";

export type CheerioNode = {
	name: string;
	children: CheerioNode[];
	attribs: { [attr: string]: string };
};

if (process.env.SCRAPE_CACHE) {
	if (!Number.isInteger(+process.env.SCRAPE_CACHE))
		throw new TypeError(
			"Environment variable SCRAPE_CACHE should be an integer",
		);
	if (+process.env.SCRAPE_CACHE < 1)
		throw new RangeError(
			"Environment variable SCRAPE_CACHE should be a positive integer",
		);
}

const CACHE_DURATION = +(process.env.SCRAPE_CACHE || 1) * 3600_000;
const cache = new Map<string, CheerioAPI>();

export default async function scrape(url: string, skipCache = false) {
	if (!skipCache) {
		const cached = cache.get(url);
		if (cached) return cached;
	}

	const html = await fetch(url).then((r) => r.text());
	const crawler = load(html);
	cache.set(url, crawler);
	setTimeout(cache.delete.bind(cache, url), CACHE_DURATION);
	return crawler;
}

export function htmlToMarkdown(contents: string, limit = 2000) {
	const markdown = decodeEntities(
		contents
			.replaceAll("\n", "")
			.replaceAll(/<a .*?href="([^"]+)".*?>(.+?)<\/a>/g, "[$2]($1)")
			.replaceAll("<hr>", "\n——————————\n")
			.replaceAll(/<\/?(strong|b)>/g, "**")
			.replaceAll(/<\/?(em|i)>/g, "*")
			.replaceAll(/<\/?u>/g, "__")
			.replaceAll(/<\/?(del|s)>/g, "~~")
			.replaceAll(/<\/?(code|kbd)>/g, "`")
			.replaceAll(/<li>(.+?)<\/li>/g, "\n- $1")
			.replaceAll(/<\/?[ou]l>/g, "")
			.trim(),
	);

	return markdown.length < limit
		? markdown
		: `${markdown.substring(0, limit - 1)}…`;
}
