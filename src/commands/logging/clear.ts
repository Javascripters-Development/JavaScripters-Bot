import { getConfig } from "../../logging.ts";

import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	GuildMessageManager,
	Message,
	User,
} from "discord.js";
import type { Command } from "djs-fsrouter";
import { deleteColor, editColor } from "../../listeners/logging.ts";

const _14_DAYS = 1209500000;

export const type = ApplicationCommandType.ChatInput;
const Config: Command = {
	description: "Remove all logged messages of a given user up to 14 days",
	options: [
		{
			name: "user",
			required: true,
			type: ApplicationCommandOptionType.User,
			description: "The user to purge from our records",
		},
	],
	async run(interaction) {
		const { guild } = interaction;
		if (!guild) return;

		await interaction.deferReply().catch(console.error);
		const { channel } = getConfig(guild) || {};
		if (!channel)
			return interaction
				.editReply("Error: No logging channel has been set.")
				.catch(console.error);
		const logs = await guild.channels.fetch(channel);
		if (!logs || !logs.isTextBased())
			return interaction
				.editReply("Error: Could not retrieve the logging channel.")
				.catch(console.error);

		const target = interaction.options.getUser("user", true);
		const targetMention = target.toString();
		const me = await guild.members.fetchMe();
		const promises = [];
		const toDelete: Message[] = [];
		let bulkPurges = 0;

		for await (const chunk of fetchTill14days(logs.messages)) {
			const targetLogs = chunk.filter((message) => {
				const { member, embeds } = message;
				if (member !== me || !embeds.length) return false;

				const [{ description: embed, color }] = embeds;
				if (!embed || (color !== deleteColor && color !== editColor))
					return false;
				if (embeds.length > 1) {
					bulkPurges++;
					promises.push(purgeBulk(target, message));
					return false;
				}
				const mentionPos = embed.indexOf(targetMention);
				if (mentionPos !== -1 && mentionPos < embed.indexOf("\n")) return true;
			});

			if (targetLogs.size) toDelete.push(...targetLogs.values());
		}

		for (let i = 0; i < toDelete.length; i += 100)
			promises.push(logs.bulkDelete(toDelete.slice(i, i + 100)));

		await Promise.allSettled(promises);
		interaction
			.editReply(
				`Erased ${toDelete.length} logs and purged ${bulkPurges} bulk logs.`,
			)
			.catch(console.error);
	},
};
export default Config;

async function* fetchTill14days(messageManager: GuildMessageManager) {
	const now = Date.now();
	let chunk = await messageManager.fetch({ limit: 100, cache: false });
	let last = chunk.last();
	while (last) {
		yield chunk.filter(
			({ createdTimestamp }) => now - createdTimestamp < _14_DAYS,
		);

		if (now - last.createdTimestamp > _14_DAYS) return;

		chunk = await messageManager.fetch({
			before: last.id,
			limit: 100,
			cache: false,
		});
		last = chunk.last();
	}
}

/**
 * Purges logs of a given user from a bulk log
 * @param user The user to erase
 * @param message The bulk log
 * @returns The number of logs removed
 */
function purgeBulk({ tag }: User, message: Message) {
	const embeds = message.embeds.filter(({ author }) => author?.name !== tag);
	if (embeds.length !== message.embeds.length)
		return embeds.length ? message.edit({ embeds }) : message.delete();
}
