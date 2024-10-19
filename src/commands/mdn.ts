import { ApplicationCommandOptionType } from "discord.js";
import type { Command } from "djs-fsrouter";

import scrape, { elementToMarkdown } from "../scraper.ts";
import type { Element } from "cheerio";

import { truncate } from "../utils/common.ts";

import { Index } from "flexsearch";
// @ts-ignore
import indexOptions from "flexsearch/dist/module/lang/latin/advanced.js";

const MDN_ROOT = "https://developer.mozilla.org";
const MDN_INDEX = `${MDN_ROOT}/en-US/search-index.json`;
const DOCS_ROOT = "/en-US/docs/";
const RESULT_INDICATOR = "d#:";
type IndexEntry = {
	title: string;
	url: string;
};

let index: IndexEntry[];
const searcher = new Index(indexOptions);

const Mdn: Command = {
	description: "Search the Modzilla Developer Network",
	options: [
		{
			name: "query",
			required: true,
			type: ApplicationCommandOptionType.String,
			description: "Your seach terms",
			autocomplete: true,
		},
	],

	autocomplete: async (interaction) => {
		const searchTerm = interaction.options.getFocused();
		if (!searchTerm) {
			interaction.respond([]).catch(console.error);
			return;
		}
		const choices = search(searchTerm)
			.map(itemToChoice)
			.filter(({ value }) => value.length <= 100);
		interaction.respond(choices).catch(console.error);
	},

	async run(interaction) {
		const query = interaction.options.getString("query", true);
		const url = query.startsWith(RESULT_INDICATOR)
			? `${MDN_ROOT}${query.replace(RESULT_INDICATOR, DOCS_ROOT)}`
			: `${MDN_ROOT}${search(query, 1)[0]?.url}`;

		const crawler = await scrape(url);
		const intro = crawler(
			".main-page-content > .section-content:first-of-type > *",
		);
		const links = crawler(
			".main-page-content > .section-content:first-of-type a",
		);
		Array.prototype.forEach.call(links, makeLinkAbsolute);
		let title: string = crawler("head title").text();
		if (title.endsWith(" | MDN")) title = title.slice(0, -6);

		const paragraphs: string[] = [];
		let totalLength = 0;
		for (const introParagraph of intro) {
			const text = elementToMarkdown(introParagraph);
			totalLength += text.length;
			if (totalLength < 2048) paragraphs.push(fixCodeLinks(text));
			else break;
		}

		interaction[interaction.deferred ? "editReply" : "reply"]({
			embeds: [
				{
					author: { name: title, url },
					description: paragraphs.join("\n"),
				},
			],
		}).catch(console.error);
	},
};
export default Mdn;

async function refreshIndex() {
	const res = await fetch(MDN_INDEX);
	if (res.ok) {
		index = await res.json();
		index.forEach(({ title }, id) => searcher.add(id, title));
	}
}
refreshIndex();
const REFRESH_INTERVAL = Number(process.env.MDN_INDEX_REFRESH) || 12; // hours
setInterval(refreshIndex, 3600_000 * REFRESH_INTERVAL);

function search(term: string, limit = 10) {
	if (!Number.isInteger(limit) || limit < 1 || limit > 10)
		throw new RangeError(
			`The number of results must be an integer between 1 and 10, inclusive (got ${limit}).`,
		);

	return searcher.search(term, limit).map((id) => index[id as number]);
}

function itemToChoice({ title, url }: IndexEntry) {
	const category = url.match(/^\/en-US\/docs\/([^\/]+)\//)?.[1] || "Web";
	if (category !== "Web") title += ` - ${category}`;
	return {
		name: truncate(title, 100),
		value: url.replace(DOCS_ROOT, RESULT_INDICATOR),
	};
}

function makeLinkAbsolute(a: Element) {
	const { href }: { href?: string } = a.attribs;
	if (href?.startsWith("/")) {
		a.attribs.href = MDN_ROOT + href;
	}
}

/**
 * Discord will not parse links surrounded with backticks.
 * So when we get something like <code><a href="...">Cool link</a></code>
 * That produces `[Cool link](...)`
 * We change it into [`Cool link`](...)
 * @param {string} text The Markdown containing offending elements
 * @returns {string} The text with fixed links
 */
function fixCodeLinks(text: string) {
	return text.replaceAll(/`\[([^\]]+)\]\(([^)]+)\)`/g, "[`$1`]($2)");
}
