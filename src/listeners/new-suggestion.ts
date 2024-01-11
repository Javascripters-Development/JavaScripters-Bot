import { Suggestion } from "../structures/suggestion.ts";
import type { Listener } from "../types/listener.ts";
import { getConfig } from "../utils.ts";

export default ({
	event: "messageCreate",
	async handler(message) {
		if (!message.inGuild() || !message.deletable) return;

		const { suggestionChannel } =
			(await getConfig.get({ guildId: message.guildId })) ?? {};

		if (!suggestionChannel) return;

		await message.delete();
		await Suggestion.createFromMessage(message);
	},
} as Listener);
