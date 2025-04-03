import { PermissionFlagsBits } from "discord.js";
import { GuildSchema } from "../../schemas/guild.ts";
import { createConfigurationManifest } from "../../structures/index.ts";
import { ConfigurationMessage } from "../../structures/index.ts";
import { checkIsValidTextChannel } from "../../utils/index.ts";
import type { Command } from "djs-fsrouter";
import { eq } from "drizzle-orm";
import { ensureGuild } from "#repository";

const manifest = createConfigurationManifest(GuildSchema, [
	{
		name: "Suggestion channel",
		description: "Suggestions will be sent here.",
		column: "suggestionChannel",
		type: "channel",
		placeholder: "Select a suggestion channel",
		validate: checkIsValidTextChannel,
	},
	{
		name: "Suggestion manager role",
		description: "The role that can approve and reject suggestions.",
		column: "suggestionManagerRole",
		type: "role",
		placeholder: "Select a manager role",
	},
	{
		name: "Suggestion upvote emoji",
		description: "The emoji for upvoting suggestions.",
		column: "suggestionUpvoteEmoji",
		type: "text",
		label: "Set upvote emoji",
		emoji: "👍",
	},
	{
		name: "Suggestion downvote emoji",
		description: "The emoji for downvoting suggestions.",
		column: "suggestionDownvoteEmoji",
		type: "text",
		label: "Set downvote emoji",
		emoji: "👎",
	},
]);

const ConfigCommand: Command = {
	description: "Configure suggestion management",
	defaultMemberPermissions: PermissionFlagsBits.Administrator,
	async run(interaction) {
		if (!interaction.inGuild()) {
			interaction.reply({
				content: "Run this command in a server to get server info",
				ephemeral: true,
			});
			return;
		}

		await ensureGuild(interaction.guildId);

		const configurationMessage = new ConfigurationMessage(manifest, {
			getWhereClause: ({ table, interaction }) => eq(table.id, interaction.guildId),
		});

		await configurationMessage.initialize(interaction);
	},
};

export default ConfigCommand;
