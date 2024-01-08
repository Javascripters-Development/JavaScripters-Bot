import { whitelistRole } from "../$config.ts";

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
	options: [
		{
			name: "role",
			required: true,
			type: ApplicationCommandOptionType.Role,
			description: "The role to ignore.",
		},
	],
	async run(interaction) {
		const { guild, options } = interaction;
		if (!guild) return;

		const role = await guild.roles.fetch(options.getRole("role", true).id);
		if (!role) {
			interaction
				.reply({
					ephemeral: true,
					content: "Error: failed to retrieve the role info.",
				})
				.catch(console.error);
			return;
		}

		await whitelistRole(role);
		interaction
			.reply({ embeds: [{ description: `${role} has been whitelisted.` }] })
			.catch(console.error);
	},
};
export default Disable;
