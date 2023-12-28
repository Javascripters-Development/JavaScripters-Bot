import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	type GuildTextBasedChannel,
} from "discord.js";
import type { Command } from "djs-fsrouter";
import { getConfig, hyperlink } from "../utils.ts";
import { handleUserError } from "../errors.ts";
import { DiscordSuggestion } from "../structures/discord-suggestion.ts";

export const type = ApplicationCommandType.ChatInput;

const Suggest: Command = {
	description: "Make a suggestion",
	defaultMemberPermissions: "0",
	options: [
		{
			type: ApplicationCommandOptionType.String,
			name: "title",
			description: "The title of the suggestion",
			required: true,
			maxLength: DiscordSuggestion.MAX_TITLE_LENGTH,
		},
		{
			type: ApplicationCommandOptionType.String,
			name: "description",
			description: "The description of the suggestion",
			maxLength: DiscordSuggestion.MAX_DESCRIPTION_LENGTH,
		},
	],
	async run(interaction) {
		if (!interaction.guild) {
			interaction.reply({
				content: "Run this command in a server to make suggestions",
				ephemeral: true,
			});
			return;
		}

		// Ensure interaction.member is not an instance of APIInteractionGuildMember
		if (!interaction.inCachedGuild()) return;

		const config = getConfig.get({ guildId: interaction.guildId });

		if (!config?.suggestionChannel) {
			return handleUserError(
				interaction,
				"There is no suggestion channel configured for this server",
			);
		}

		const suggestionChannel = (await interaction.guild.channels.fetch(
			config.suggestionChannel,
		)) as GuildTextBasedChannel;

		const suggestion = await DiscordSuggestion.create({
			title: interaction.options.getString("title", true),
			description: interaction.options.getString("description") ?? undefined,
			member: interaction.member,
			channel: suggestionChannel,
			dbConfig: config,
		});

		return interaction.reply({
			// rome-ignore format: more readable when not formatted
			content: `Your suggestion has been submitted, you can view it ${hyperlink("here", suggestion.messageUrl)}`,
			ephemeral: true,
		});
	},
};

export default Suggest;
