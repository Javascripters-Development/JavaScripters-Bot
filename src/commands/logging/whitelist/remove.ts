import { getWhitelist, unwhitelistRole } from "../$config.ts";

import {
	ApplicationCommandType,
	ApplicationCommandOptionType,
	Role,
	Collection,
} from "discord.js";
import type { Command } from "djs-fsrouter";

export const type = ApplicationCommandType.ChatInput;
const Remove: Command = {
	description: "Add a role to be ignored by the logging system",
	options: [
		{
			name: "role",
			required: true,
			type: ApplicationCommandOptionType.String,
			description: "The role to stop ignoring.",
			autocomplete: true,
		},
	],
	async autocomplete(interaction) {
		const { guild } = interaction;
		if (!guild) return;

		const whitelist = getWhitelist(guild);
		const roles = guild.roles.cache.filter(({ id }) => whitelist.includes(id));
		interaction.respond(rolesToChoices(roles)).catch(console.error);
	},

	async run(interaction) {
		const { guild, options } = interaction;
		if (!guild) return;

		const role = await guild.roles.fetch(options.getString("role", true));
		if (!role) {
			interaction
				.reply({
					ephemeral: true,
					content: "Error: failed to retrieve the role info.",
				})
				.catch(console.error);
			return;
		}

		await unwhitelistRole(role);
		interaction
			.reply({ embeds: [{ description: `${role} has been un-whitelisted.` }] })
			.catch(console.error);
	},
};
export default Remove;

function rolesToChoices(roles: Collection<string, Role>) {
	return roles
		.map((role) => ({ name: role.name, value: role.id }))
		.sort((a, b) => (a.name === b.name ? 0 : a.name > b.name ? 1 : -1));
}
