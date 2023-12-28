import {
	ActionRowBuilder,
	TextInputBuilder,
	ModalBuilder,
	TextInputStyle,
	inlineCode,
} from "discord.js";
import { DiscordSuggestion } from "../structures/discord-suggestion.ts";
import type { Listener } from "../types/listener.ts";
import {
	Time,
	capitalizeFirstLetter,
	getConfig,
	getKeyByValue,
	hyperlink,
} from "../utils.ts";
import { UserError, handleUserError } from "../errors.ts";
import type {
	SuggestionStatus,
	UpdatedSuggestionStatus,
} from "../schemas/suggestion.ts";
import { SuggestionUtil } from "../structures/suggestionUtil.ts";

const MODAL_ID = "suggestion-modal";
const MODAL_INPUT_ID = "suggestion-reason";

export default [
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
				return handleUserError(
					interaction,
					`You're missing the manager role and ${inlineCode(
						"ManageGuild",
					)} permission`,
				);
			}

			if (
				!config?.suggestionManagerRole &&
				!interaction.member.permissions.has("ManageGuild")
			) {
				return handleUserError(
					interaction,
					`You're missing the ${inlineCode("ManageGuild")} permission`,
				);
			}

			const suggestion = await SuggestionUtil.getInstanceFromMessage(
				interaction.message,
			);

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
				.setMaxLength(DiscordSuggestion.MAX_REASON_LENGTH)
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

			suggestion.setStatus(
				modalInteraction.user,
				status,
				inputReason || undefined,
			);

			await SuggestionUtil.updateMessage(suggestion, config);
			await modalInteraction.reply({
				content: `You set the status of ${hyperlink(
					"this suggestion",
					interaction.message.url,
				)} to ${inlineCode(suggestion.status.toLowerCase())}`,
				ephemeral: true,
			});
		},
	},
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
			const suggestion = await SuggestionUtil.getInstanceFromMessage(
				interaction.message,
			);

			if (interaction.customId === SuggestionUtil.VOTE_BUTTON_ID.UPVOTE) {
				try {
					await suggestion.upvote(interaction.user.id);
					await interaction.reply({
						content: `Successfully upvoted ${hyperlink(
							"this",
							suggestion.messageUrl,
						)} suggestion`,
						ephemeral: true,
					});
				} catch (error) {
					if (!(error instanceof UserError)) throw error;

					return handleUserError(
						interaction,
						"You already upvoted this suggestion",
					);
				}
			} else {
				try {
					await suggestion.downvote(interaction.user.id);
					await interaction.reply({
						content: `Successfully downvoted ${hyperlink(
							"this",
							suggestion.messageUrl,
						)} suggestion`,
						ephemeral: true,
					});
				} catch (error) {
					if (!(error instanceof UserError)) throw error;

					return handleUserError(
						interaction,
						"You already downvoted this suggestion",
					);
				}
			}

			await SuggestionUtil.updateMessage(suggestion, config);
		},
	},
] as Listener[];
