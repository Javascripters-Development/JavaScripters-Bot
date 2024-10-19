import { load, type CheerioAPI, type Element } from "cheerio";
import decodeEntities from "entities-decode";

export type CheerioNode = {
	name: string;
	children: CheerioNode[];
	attribs: { [attr: string]: string };
};

const CACHE_DURATION = (process.env.SCRAPE_CACHE_LIFETIME || 3) * 3600_000;
const cache = CACHE_DURATION
	? new Map<string, { fetchDate: number; crawler: CheerioAPI }>()
	: null;

export default async function scrape(url: string, skipCache = false) {
	const now = Date.now();
	if (cache && !skipCache) {
		const cached = cache.get(url);
		if (cached && cached.fetchDate + CACHE_DURATION < now) {
			return cached.crawler;
		}
	}
	const html = await fetch(url).then((r) => r.text());
	const crawler = load(html);
	cache?.set(url, { fetchDate: now, crawler });
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
