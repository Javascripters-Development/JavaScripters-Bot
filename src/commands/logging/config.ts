import { LogMode, getConfig } from "./$config.ts";

import { ApplicationCommandType } from "discord.js";
import type { Command } from "djs-fsrouter";

export const type = ApplicationCommandType.ChatInput;
const Config: Command = {
	description: "See the current config",
	dmPermission: false,
	defaultMemberPermissions: "0",
	async run(interaction) {
		if (!interaction.guild) return;

		const { mode, channel } = getConfig(interaction.guild) || {};
		const message = mode
			? `Logging ${LogMode[mode].toLowerCase()}\nLogs channel: <#${channel}>`
			: "Logging messages is disabled.";
		interaction
			.reply({
				ephemeral: true,
				embeds: [{ description: message }],
			})
			.catch(console.error);
	},
};
export default Config;
