import { LogMode, setLogging } from "./$config.ts";

import {
	ApplicationCommandType,
	ApplicationCommandOptionType,
	ChannelType,
} from "discord.js";
import type { Command } from "djs-fsrouter";

export const type = ApplicationCommandType.ChatInput;
const Disable: Command = {
	description: "Enable message logging",
	dmPermission: false,
	defaultMemberPermissions: "0",
	options: [
		{
			name: "log",
			required: true,
			type: ApplicationCommandOptionType.Integer,
			description: "What should be logged?",
			choices: [
				{ name: "Deletions only", value: LogMode.DELETES },
				{
					name: "Deletions & edits",
					value: LogMode.DELETES | LogMode.EDITS,
				},
			],
		},
		{
			name: "channel",
			required: true,
			type: ApplicationCommandOptionType.Channel,
			channelTypes: [ChannelType.GuildText],
			description: "The channel where the logs will be sent.",
		},
	],
	async run(interaction) {
		if (!interaction.guild) return;

		const mode = interaction.options.getInteger("log", true);
		const channel = interaction.options.getChannel("channel", true, [
			ChannelType.GuildText,
		]);
		await setLogging(interaction.guild, { mode, channel });
		interaction
			.reply({
				ephemeral: true,
				content: `Logging set to ${LogMode[mode]} in ${channel}`,
			})
			.catch(console.error);
	},
};
export default Disable;
