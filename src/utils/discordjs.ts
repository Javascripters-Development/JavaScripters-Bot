import {
	PermissionFlagsBits,
	type Channel,
	type GuildBasedChannel,
	type TextBasedChannel,
} from "discord.js";
import { UserError } from "./error.ts";

/**
 * Check if a channel is a guild text channel the client can send messages in.
 *
 * @throws {UserError}
 */
export const checkIsValidTextChannel = (
	channel: Channel,
): channel is GuildBasedChannel & TextBasedChannel => {
	if (channel.isDMBased())
		throw new UserError(`${channel} must be a guild channel`);

	if (!channel.isTextBased())
		throw new UserError(`${channel} must be a text channel`);

	const clientPermissionsInChannel = channel.permissionsFor(
		channel.client.user,
	);

	if (!clientPermissionsInChannel?.has(PermissionFlagsBits.SendMessages))
		throw new UserError(
			`I do not have permission to send message to ${channel}`,
		);

	return true;
};
