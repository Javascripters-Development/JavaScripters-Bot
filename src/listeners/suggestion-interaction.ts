import {
	ActionRowBuilder,
	TextInputBuilder,
	ModalBuilder,
	TextInputStyle,
	inlineCode,
} from "discord.js";
import type { Listener } from "../types/listener.ts";
import {
	Time,
	capitalizeFirstLetter,
	getConfig,
	getKeyByValue,
	hyperlink,
} from "../utils.ts";
import type {
	SuggestionStatus,
	UpdatedSuggestionStatus,
} from "../schemas/suggestion.ts";
import {
	SuggestionUtil,
	type SuggestionButtonId,
} from "../structures/suggestion-util.ts";
import { Suggestion } from "../structures/suggestion.ts";

const MODAL_ID = "suggestion-modal";
const MODAL_INPUT_ID = "suggestion-reason";

export default ([
	// Handle status update interaction
	{
		event: "interactionCreate",
		async handler(interaction) {
			if (
				!(
					SuggestionUtil.isValidInteraction(interaction) &&
					interaction.member &&
					// Ensure interaction.member is not an instance of APIInteractionGuildMember
					interaction.inCachedGuild()
				)
			)
				return;

			const config = getConfig.get({ guildId: interaction.guildId });

			if (
				config?.suggestionManagerRole &&
				!interaction.member.roles.cache.has(config.suggestionManagerRole)
			) {
				return interaction.reply({
					content: `You're missing the manager role and ${inlineCode(
						"ManageGuild",
					)} permission`,
					ephemeral: true,
				});
			}

			if (
				!config?.suggestionManagerRole &&
				!interaction.member.permissions.has("ManageGuild")
			) {
				return interaction.reply({
					content: `You're missing the ${inlineCode("ManageGuild")} permission`,
					ephemeral: true,
				});
			}

			const suggestion = await Suggestion.createFromMessage(interaction.message);

			const status = getKeyByValue(
				SuggestionUtil.BUTTON_ID,
				interaction.customId as UpdatedSuggestionStatus,
			) as SuggestionStatus | undefined;

			if (!status)
				throw new Error(
					`Could not map button ID "${interaction.customId}" to a valid suggestion status`,
				);

			const textInput = new TextInputBuilder()
				.setCustomId(MODAL_INPUT_ID)
				.setStyle(TextInputStyle.Paragraph)
				.setLabel("What's the reason?")
				.setPlaceholder("Leave empty if no reason necessary...")
				.setMaxLength(Suggestion.MAX_REASON_LENGTH)
				.setRequired(false);
			const actionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(
				textInput,
			);
			const modal = new ModalBuilder()
				.setCustomId(MODAL_ID)
				.setTitle(
					`${capitalizeFirstLetter(
						SuggestionUtil.getStatusVerb(status),
					)} suggestion`,
				)
				.addComponents(actionRow);

			await interaction.showModal(modal);

			const modalInteraction = await interaction.awaitModalSubmit({
				time: Time.Minute * 10,
			});
			const inputReason =
				modalInteraction.fields.getTextInputValue(MODAL_INPUT_ID);

			await suggestion.setStatus(
				modalInteraction.user,
				status,
				inputReason || undefined,
				config,
			);

			const statusString =
				SuggestionUtil.BUTTON_ID_STATUS_MAP[
					interaction.customId as SuggestionButtonId
				];

			await modalInteraction.reply({
				content: `You set the status of ${hyperlink(
					"this suggestion",
					interaction.message.url,
				)} to ${inlineCode(statusString.toLowerCase())}`,
				ephemeral: true,
			});
		},
	},
	// Handle suggestion vote interaction
	{
		event: "interactionCreate",
		async handler(interaction) {
			if (
				!(
					SuggestionUtil.isValidVoteInteraction(interaction) &&
					interaction.member &&
					// Ensure interaction.member is not an instance of APIInteractionGuildMember
					interaction.inCachedGuild()
				)
			)
				return;

			const config = getConfig.get({ guildId: interaction.guildId });
			const suggestion = await Suggestion.createFromMessage(interaction.message);

			if (interaction.customId === SuggestionUtil.VOTE_BUTTON_ID.UPVOTE) {
				await suggestion.upvote(interaction.user.id, config);
				await interaction.reply({
					content: `Successfully upvoted ${hyperlink(
						"this",
						interaction.message.url,
					)} suggestion`,
					ephemeral: true,
				});
			} else {
				await suggestion.downvote(interaction.user.id, config);
				await interaction.reply({
					content: `Successfully downvoted ${hyperlink(
						"this",
						interaction.message.url,
					)} suggestion`,
					ephemeral: true,
				});
			}
		},
	},
] as Listener[]);
