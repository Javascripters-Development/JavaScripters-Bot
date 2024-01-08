import { getWhitelist } from "../$config.ts";

import {
	ApplicationCommandType,
	ApplicationCommandOptionType,
} from "discord.js";
import type { Command } from "djs-fsrouter";

export const type = ApplicationCommandType.ChatInput;
const Disable: Command = {
	description: "Add a role to be ignored by the logging system",
	dmPermission: false,
	defaultMemberPermissions: "0",
	async run(interaction) {
		const { guild } = interaction;
		if (!guild) return;

		const whitelist = getWhitelist(guild)
			.map((roleId) => `<@&${roleId}>`)
			.join("\n");
		interaction
			.reply({
				embeds: [
					{
						title: "Whitelisted roles",
						description: whitelist || "*none*",
					},
				],
			})
			.catch(console.error);
	},
};
export default Disable;
