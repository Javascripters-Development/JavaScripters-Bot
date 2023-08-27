import {
	ActionRowBuilder,
	TextInputBuilder,
	ModalBuilder,
	TextInputStyle,
	inlineCode,
} from "discord.js";
import {
	Suggestion,
	type SuggestionButtonId,
} from "../structures/suggestion.ts";
import type { Listener } from "../types/listener.ts";
import { Time, capitalizeFirstLetter, getConfig, hyperlink } from "../utils.ts";
import { handleUserError } from "../errors.ts";

const MODAL_ID = "suggestion-modal";
const MODAL_INPUT_ID = "suggestion-reason";

export default {
	event: "interactionCreate",
	async handler(interaction) {
		if (
			!(
				Suggestion.isValidInteraction(interaction) &&
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

		if (!interaction.member.permissions.has("ManageGuild")) {
			return handleUserError(
				interaction,
				`You're missing the ${inlineCode("ManageGuild")} permission`,
			);
		}

		const status =
			Suggestion.BUTTON_ID_STATUS_MAP[
				interaction.customId as SuggestionButtonId
			];

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
				`${capitalizeFirstLetter(Suggestion.getStatusVerb(status))} suggestion`,
			)
			.addComponents(actionRow);

		await interaction.showModal(modal);

		const modalInteraction = await interaction.awaitModalSubmit({
			time: Time.Minute * 10,
		});

		const suggestion = Suggestion.createFromMessage(interaction.message);
		const messageOptions = suggestion.getMessageOptions({
			status,
			member: modalInteraction.member,
			reason: modalInteraction.fields.getTextInputValue(MODAL_INPUT_ID),
		});

		await interaction.message.edit(messageOptions);
		await modalInteraction.reply({
			content: `You set the status of ${hyperlink(
				"this suggestion",
				interaction.message.url,
			)} to ${inlineCode(status)}`,
			ephemeral: true,
		});
	},
} as Listener;
