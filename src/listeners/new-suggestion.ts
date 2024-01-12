import { Suggestion } from "../structures/suggestion.ts";
import type { Listener } from "../types/listener.ts";
import { getConfig } from "../utils.ts";

export default ({
	event: "messageCreate",
	async handler(message) {
		if (
			!message.inGuild() ||
			!message.deletable ||
			!message.member ||
			message.author.bot
		)
			return;

		const dbConfig = getConfig.get({ guildId: message.guildId });

		if (!dbConfig?.suggestionChannel) return;

		await message.delete();

		Suggestion.create({
			description: message.content,
			channel: message.channel,
			member: message.member,
			dbConfig,
		});
	},
} as Listener);
