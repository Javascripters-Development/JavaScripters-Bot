import {
	type InteractionReplyOptions,
	InteractionType,
	ApplicationCommandOptionType,
} from "discord.js";
import type { Command } from "djs-fsrouter";

import { client } from "../index.ts";
import { stringSelectMenu } from "../components.ts";
import scrape, { htmlToMarkdown } from "../scraper.ts";
import type { Element } from "cheerio";

const MDN_SELECT = "mdn_select";
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
		},
	],
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

		const searchTerm = interaction.options.getString("query", true);
		const searchResult = await search(searchTerm).catch(console.error);
		let reply: InteractionReplyOptions;

		if (!searchResult?.ok) {
			reply = {
				ephemeral: true,
				content: "The search failed, please try again.",
			};
		} else {
			const { items }: { items: SearchResult[] } = await searchResult.json();
			if (!items.length) {
				reply = {
					ephemeral: true,
					content: "Your search yielded no results.",
				};
			} else {
				reply = {
					ephemeral: true,
					embeds: [
						{
							description: `Results for "${searchTerm}"`,
							url: MDN_URL,
						},
					],
					components: [stringSelectMenu(MDN_SELECT, items.map(itemToChoice))],
				};
			}
		}
		interaction.reply(reply).catch(console.error);
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
	return { label: title, value: link };
}

client.on("interactionCreate", async (interaction) => {
	if (!interaction.isStringSelectMenu() || interaction.customId !== MDN_SELECT)
		return;

	const [url] = interaction.values;
	const crawler = await scrape(url);
	const intro = crawler(
		".main-page-content > .section-content:first-of-type p",
	);
	let title: string = crawler("head title").text();
	if (title.endsWith(" | MDN")) title = title.slice(0, -6);
	const paragraphs: string[] = [];
	let totalLength = 0;
	for (const introParagraph of intro) {
		makeLinksAbsolute(introParagraph);
		const text = htmlToMarkdown(
			crawler(introParagraph).prop("innerHTML") || "",
		);
		totalLength += text.length;
		if (totalLength < 2048) paragraphs.push(text);
		else break;
	}
	interaction
		.reply({
			embeds: [
				{
					author: { name: title, url },
					description: paragraphs.join("\n"),
				},
			],
		})
		.catch(console.error);
});

function makeLinksAbsolute(p: Element) {
	for (const elm of p.children) {
		if (elm.type !== "tag" || elm.name !== "a") continue;
		const { href }: { href?: string } = elm.attribs;
		if (href?.startsWith("/")) {
			elm.attribs.href = `https://developer.mozilla.org${href}`;
		}
	}
}
