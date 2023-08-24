import { ApplicationCommandOptionType } from "discord.js";
import type { Command } from "djs-fsrouter";

import scrape, { htmlToMarkdown } from "../scraper.ts";
import type { Element } from "cheerio";

const MDN_URL = "https://developer.mozilla.org/en-US/";
type SearchResult = {
	title: string;
	link: string;
	snippet: string;
};

const Info: Command = {
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
		const searchResult = await search(searchTerm).catch(console.error);
		if (!searchResult?.ok) {
			interaction.respond([]).catch(console.error);
			if (searchResult)
				console.error(
					`Got ${searchResult.status} ${searchResult.statusText} code trying to use CSE`,
				);
		} else {
			const { items }: { items: SearchResult[] } = await searchResult.json();
			interaction.respond(items.map(itemToChoice)).catch(console.error);
		}
	},

	async run(interaction) {
		if (!CAN_QUERY) {
			interaction
				.reply({
					ephemeral: true,
					content: "Sorry! This command is unavailable for the moment.",
				})
				.catch(console.error);
			return;
		}

		const url = MDN_URL + interaction.options.getString("query", true);
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
			const text = htmlToMarkdown(
				crawler(introParagraph).prop("innerHTML") || "",
			);
			totalLength += text.length;
			if (totalLength < 2048) paragraphs.push(fixCodeLinks(text));
			else break;
		}
		interaction
			.reply({
				embeds: [
					{
						author: { name: title, url },
						description: paragraphs.join("\n"),
						footer: {
							text: `Requested by ${interaction.user.username}`,
							icon_url: interaction.user.avatarURL() || undefined,
						},
					},
				],
			})
			.catch(console.error);
	},
};
export default Info;

const BASE_URL =
	process.env.CSE_KEY && process.env.CSE_CSX
		? `https://www.googleapis.com/customsearch/v1/siterestrict?key=${process.env.CSE_KEY}&cx=${process.env.CSE_CSX}`
		: "";

const CAN_QUERY = !!BASE_URL;

function search(term: string, num = 10) {
	if (!CAN_QUERY)
		throw new Error("Cannot query Google CSE, key or CSX missing.");
	if (!Number.isInteger(num) || num < 1 || num > 10)
		throw new RangeError(
			`The number of results must be an integer between 1 and 10, inclusive (got ${num}).`,
		);

	return fetch(`${BASE_URL}&q=${encodeURIComponent(term)}&num=${num}`);
}

function itemToChoice({ title, link }: SearchResult) {
	if (title.endsWith(" | MDN")) title = title.slice(0, -6);
	return { name: title, value: link.substring(MDN_URL.length) };
}

function makeLinkAbsolute(a: Element) {
	const { href }: { href?: string } = a.attribs;
	if (href?.startsWith("/")) {
		a.attribs.href = `https://developer.mozilla.org${href}`;
	}
}

function fixCodeLinks(text: string) {
	return text.replaceAll(/`\[([^\]]+)\]\(([^)]+)\)`/g, "[`$1`]($2)");
}
