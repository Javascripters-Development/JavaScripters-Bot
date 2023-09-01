import { CommandInteraction, MessageComponentInteraction } from "discord.js";

export class UserError extends Error {
	constructor(
		message?: string,
		public readonly identifier?: string,
		options?: ErrorOptions,
	) {
		super(message, options);
	}
}

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
