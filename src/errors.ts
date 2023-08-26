import { ChatInputCommandInteraction } from "discord.js";

export type UserErrorContext = ChatInputCommandInteraction;

/**
 * Handles any kind of user error.
 *
 * @param context The interaction/message context
 */
export const handleUserError = (context: UserErrorContext, message: string) => {
	if (context instanceof ChatInputCommandInteraction) {
		return handleChatInputCommandInteraction(context, message);
	}
};

const handleChatInputCommandInteraction = (
	interaction: ChatInputCommandInteraction,
	message: string,
) => {
	const messageOptions = {
		content: `❌ ${message}`,
		ephemeral: true,
	};

	if (!interaction.replied) {
		return interaction.reply(messageOptions);
	} else {
		return interaction.followUp(messageOptions);
	}
};
