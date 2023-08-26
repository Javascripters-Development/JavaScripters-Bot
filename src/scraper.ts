import { load, type CheerioAPI, type Element } from "cheerio";
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

export function elementToMarkdown(element: Element) {
	let md = "";
	for (const child of element.children) {
		if (child.type === "text") md += child.data.replaceAll("\n", "");
		else if (child.type === "tag") md += elementToMarkdown(child);
	}
	md = decodeEntities(md.trim());
	switch (element.name) {
		case "a":
			return `[${md}](${element.attribs.href})`;
		case "hr":
			return "\n——————————\n";
		case "strong":
		case "b":
			return `**${md}**`;
		case "em":
		case "i":
			return `*${md}*`;
		case "u":
			return `__${md}__`;
		case "del":
		case "s":
			return `~~${md}~~`;
		case "code":
		case "kbd":
			return `\`${md}\``;
		case "li":
			return `\n- ${md}`;
		default:
			return md;
	}
}
