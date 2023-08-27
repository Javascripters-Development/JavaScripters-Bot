import { CommandInteraction, MessageComponentInteraction } from "discord.js";

export type UserErrorContext = CommandInteraction | MessageComponentInteraction;

/**
 * Handles any kind of user error.
 *
 * @param context The interaction/message context
 */
export const handleUserError = (context: UserErrorContext, message: string) => {
	const messageOptions = {
		content: `❌ ${message}`,
		ephemeral: true,
	};

	if (!context.replied) {
		return context.reply(messageOptions);
	} else {
		return context.followUp(messageOptions);
	}
};
