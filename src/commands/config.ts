import { PermissionFlagsBits, TextInputStyle, type Channel } from "discord.js";
import { Config } from "../schemas/config.ts";
import {
	createDatabaseConfigurationManifest,
	type ConfigurationOptionPartial,
} from "../structures/index.ts";
import { LogMode } from "../types/logging.ts";
import { DatabaseStore, ConfigurationMessage } from "../structures/index.ts";
import type { Command } from "djs-fsrouter";
import type { InferSelectModel } from "drizzle-orm";

const checkIsValidTextChannel = (channel: Channel) => {
	if (channel.isDMBased()) return `${channel} must be a guild channel`;

	if (!channel.isTextBased()) return `${channel} must be a text channel`;

	const clientPermissionsInChannel = channel.permissionsFor(
		channel.client.user,
	);

	if (!clientPermissionsInChannel?.has(PermissionFlagsBits.SendMessages))
		return `I do not have permission to send message to ${channel}`;

	return true;
};

const LogModeValues = Object.keys(LogMode).filter(
	(item) => !Number.isNaN(Number(item)),
);

const LogModeSelectOptions = Object.entries(LogMode)
	.filter(([, value]) => typeof value === "number")
	.map(([key, value]) => ({ name: key, value: value.toString() }));

const store = new DatabaseStore();

const manifest = createDatabaseConfigurationManifest(Config, [
	{
		name: "Gateway channel",
		description: "New members will be welcomed here.",
		column: "gatewayChannel",
		type: "channel",
		validate: checkIsValidTextChannel,
	},
	// Gateway join
	{
		name: "Gateway join title",
		description: "Message title when a user joins.",
		column: "gatewayChannel",
		type: "text",
		// TODO: implement string placeholders
		placeholder: "Welcome ${mention}!",
	},
	{
		name: "Gateway join content",
		description: "Message content when a user joins.",
		column: "gatewayChannel",
		type: "text",
		// TODO: implement string placeholders
		placeholder: "We hope you enjoy your stay!",
		style: TextInputStyle.Paragraph,
	},
	// Gateway leave
	{
		name: "Gateway leave title",
		description: "Message title when a user leaves.",
		column: "gatewayChannel",
		type: "text",
		// TODO: implement string placeholders
		placeholder: "Goodbye ${mention}!",
	},
	{
		name: "Gateway leave content",
		description: "Message content when a user leaves.",
		column: "gatewayChannel",
		type: "text",
		// TODO: implement string placeholders
		placeholder: "We are sorry to see you go ${mention}",
		style: TextInputStyle.Paragraph,
	},
	// Logging
	{
		name: "Logging mode",
		description: "Determines what should be logged.",
		column: "loggingMode",
		type: "select",
		options: LogModeSelectOptions,
		validate(value) {
			if (!LogModeValues.includes(value))
				return "The provided logging mode is invalid";

			return true;
		},
		toStore(value): number {
			return Number.parseInt(value);
		},
		fromStore(value): string {
			return (value as number).toString();
		},
	},
	{
		name: "Logging channel",
		description: "Log messages will be sent here.",
		column: "loggingChannel",
		type: "channel",
		validate: checkIsValidTextChannel,
	},
	// Suggestion
	{
		name: "Suggestion channel",
		description: "Suggestions will be sent here.",
		column: "suggestionChannel",
		type: "channel",
		validate: checkIsValidTextChannel,
	},
	{
		name: "Suggestion manager role",
		description: "The role that can approve and reject suggestions.",
		column: "suggestionManagerRole",
		type: "role",
	},
	{
		name: "Suggestion upvote emoji",
		description: "The emoji for upvoting suggestions.",
		column: "suggestionUpvoteEmoji",
		type: "text",
	},
	{
		name: "Suggestion downvote emoji",
		description: "The emoji for downvoting suggestions.",
		column: "suggestionDownvoteEmoji",
		type: "text",
	},
] satisfies ConfigurationOptionPartial<
	keyof InferSelectModel<typeof Config>,
	DatabaseStore
>[]);

const ConfigCommand: Command = {
	description: "Configure the bot",
	defaultMemberPermissions: PermissionFlagsBits.Administrator,
	async run(interaction) {
		if (!interaction.inGuild()) {
			interaction.reply({
				content: "Run this command in a server to get server info",
				ephemeral: true,
			});
			return;
		}

		const configurationMessage = new ConfigurationMessage(store, manifest);

		await configurationMessage.initialize(interaction);
	},
};

export default ConfigCommand;
