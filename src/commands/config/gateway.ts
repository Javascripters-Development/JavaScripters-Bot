import { PermissionFlagsBits, TextInputStyle } from "discord.js";
import { GuildSchema } from "../../schemas/guild.ts";
import { createConfigurationManifest } from "../../structures/index.ts";
import { ConfigurationMessage } from "../../structures/index.ts";
import type { Command } from "djs-fsrouter";
import { eq } from "drizzle-orm";
import { checkIsValidTextChannel } from "../../utils/index.ts";

const manifest = createConfigurationManifest(GuildSchema, [
	{
		name: "Gateway channel",
		description: "New members will be welcomed here.",
		column: "gatewayChannel",
		type: "channel",
		placeholder: "Select a gateway channel",
		validate: checkIsValidTextChannel,
	},
	// Join
	{
		name: "Gateway join title",
		description: "Message title when a user joins.",
		column: "gatewayJoinTitle",
		type: "text",
		placeholder: "Welcome [mention]!",
	},
	{
		name: "Gateway join content",
		description: "Message content when a user joins.",
		column: "gatewayJoinContent",
		type: "text",
		placeholder: "We hope you enjoy your stay!",
		style: TextInputStyle.Paragraph,
	},
	// Leave
	{
		name: "Gateway leave title",
		description: "Message title when a user leaves.",
		column: "gatewayLeaveTitle",
		type: "text",
		placeholder: "Goodbye [mention]!",
	},
	{
		name: "Gateway leave content",
		description: "Message content when a user leaves.",
		column: "gatewayLeaveContent",
		type: "text",
		placeholder: "We are sorry to see you go [mention]",
		style: TextInputStyle.Paragraph,
	},
]);

const ConfigCommand: Command = {
	description: "Configure the gateway",
	defaultMemberPermissions: PermissionFlagsBits.Administrator,
	async run(interaction) {
		if (!interaction.inGuild()) {
			interaction.reply({
				content: "Run this command in a server to get server info",
				ephemeral: true,
			});
			return;
		}

		const configurationMessage = new ConfigurationMessage(manifest, {
			getWhereClause: ({ table, interaction }) => eq(table.id, interaction.guildId),
		});

		await configurationMessage.initialize(interaction);
	},
};

export default ConfigCommand;
