import { load, type CheerioAPI } from "cheerio";

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
