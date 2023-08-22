import {
	type InteractionReplyOptions,
	type APIEmbedField,
	ApplicationCommandOptionType,
} from "discord.js";
import type { Command } from "djs-fsrouter";

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
			const { items } = await searchResult.json();
			if (!items.length) {
				reply = {
					ephemeral: true,
					content: "Your search yielded no results.",
				};
			} else {
				reply = {
					embeds: [
						{
							description: `Results for "${searchTerm}"`,
							url: MDN_URL,
							fields: items.map(itemToField),
						},
					],
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

function itemToField({ title, link, snippet }: SearchResult): APIEmbedField {
	return {
		name: title,
		value: `${
			link.startsWith(MDN_URL)
				? `[${link.substring(MDN_URL.length)}](${link})`
				: link
		}
            ${snippet}`,
	};
}
