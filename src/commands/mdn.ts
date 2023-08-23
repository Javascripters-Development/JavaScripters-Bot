import {
	type InteractionReplyOptions,
	InteractionType,
	ApplicationCommandOptionType,
} from "discord.js";
import type { Command } from "djs-fsrouter";

import { client } from "../index.ts";
import { stringSelectMenu } from "../components.ts";

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

function search(term: string, num = 5) {
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

client.on("interactionCreate", (interaction) => {
	if (interaction.isStringSelectMenu() && interaction.customId === MDN_SELECT) {
		const [choice] = interaction.values;
		interaction
			.reply({
				embeds: [
					{
						title: choice.substring(choice.lastIndexOf("/") + 1),
						description: `[Open in browser](${choice})`,
					},
				],
			})
			.catch(console.error);
	}
});
