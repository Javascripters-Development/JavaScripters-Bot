import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	type GuildTextBasedChannel,
} from "discord.js";
import type { Command } from "djs-fsrouter";
import { getConfig, hyperlink } from "../utils.ts";
import { handleUserError } from "../errors.ts";
import { Suggestion } from "../structures/suggestion.ts";

export const type = ApplicationCommandType.ChatInput;

const Suggest: Command = {
	description: "Get info about the bot and server",
	defaultMemberPermissions: "0",
	options: [
		{
			type: ApplicationCommandOptionType.String,
			name: "title",
			description: "The title of the suggestion",
			required: true,
			maxLength: 100,
		},
		{
			type: ApplicationCommandOptionType.String,
			name: "description",
			description: "The description of the suggestion",
			maxLength: 2000,
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

		const suggestion = new Suggestion(
			interaction.member,
			interaction.options.getString("title", true),
			interaction.options.getString("description") ?? undefined,
		);

		const suggestionMessage = await suggestionChannel.send(
			suggestion.getMessageOptions(),
		);

		await suggestionMessage.react(config.suggestionUpvoteEmoji ?? "👍");
		await suggestionMessage.react(config.suggestionUpvoteEmoji ?? "👎");

		await suggestionMessage.startThread({
			name: `Suggestion: ${suggestion.title}`,
			reason: `suggestion made by ${interaction.user.username}`,
		});

		return interaction.reply({
			content: `Your suggestion has been submitted, you can view it ${hyperlink(
				"here",
				suggestionMessage.url,
			)}`,
			ephemeral: true,
		});
	},
};

export default Suggest;
