import { PermissionFlagsBits, type Channel } from "discord.js";
import { Config } from "../../schemas/config.ts";
import { createConfigurationManifest } from "../../structures/index.ts";
import { ConfigurationMessage } from "../../structures/index.ts";
import { checkIsValidTextChannel } from "../../utils/index.ts";
import type { Command } from "djs-fsrouter";
import { eq } from "drizzle-orm";
import { LogMode } from "../../types/logging.ts";

const LogModeValues = Object.keys(LogMode).filter(
	(item) => !Number.isNaN(Number(item)),
);

const LogModeSelectOptions = Object.entries(LogMode)
	.filter(([, value]) => typeof value === "number")
	.map(([key, value]) => ({ label: key, value: value.toString() }));

const manifest = createConfigurationManifest(Config, [
	{
		name: "Logging mode",
		description: "Determines what should be logged.",
		column: "loggingMode",
		type: "select",
		placeholder: "Select a logging mode",
		options: LogModeSelectOptions,
		validate(value) {
			if (!LogModeValues.includes(value))
				return "The provided logging mode is invalid";

			return true;
		},
		toDatabase(value): number {
			return Number.parseInt(value);
		},
		fromDatabase(value): string {
			return value ? (value as number).toString() : "";
		},
	},
	{
		name: "Logging channel",
		description: "Log messages will be sent here.",
		column: "loggingChannel",
		type: "channel",
		placeholder: "Select a logging channel",
		validate: checkIsValidTextChannel,
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

		const configurationMessage = new ConfigurationMessage(Config, manifest, {
			getWhereClause: ({ table, interaction }) =>
				eq(table.id, interaction.guildId),
		});

		await configurationMessage.initialize(interaction);
	},
};

export default ConfigCommand;
