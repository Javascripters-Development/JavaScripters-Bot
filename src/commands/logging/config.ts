import { LogMode, getConfig, getWhitelist } from "./$config.ts";

import { ApplicationCommandType } from "discord.js";
import type { Command } from "djs-fsrouter";

export const type = ApplicationCommandType.ChatInput;
const Config: Command = {
	description: "See the current config",
	async run(interaction) {
		const { guild } = interaction;
		if (!guild) return;

		const { mode, channel } = getConfig(guild) || {};
		let message = mode
			? `Logging ${LogMode[mode].toLowerCase()}\nLogs channel: <#${channel}>`
			: "Logging messages is disabled.";
		if (mode) {
			const whitelist = getWhitelist(guild)
				.map((roleId) => `<@&${roleId}>`)
				.join(" ");
			if (whitelist) message += `\n\n**Whitelisted roles:**\n${whitelist}`;
		}
		interaction
			.reply({
				ephemeral: true,
				embeds: [{ description: message }],
			})
			.catch(console.error);
	},
};
export default Config;
