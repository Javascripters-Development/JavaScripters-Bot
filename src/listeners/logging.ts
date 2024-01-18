import {
	type Guild,
	Message,
	type APIEmbed,
	GuildMember,
	type PartialMessage,
} from "discord.js";
import {
	LogMode,
	getConfig,
	getWhitelist,
	unwhitelistRole,
} from "../commands/logging/$config.ts";
import type { Listener } from "../types/listener.ts";

export const deleteColor = 0xdd4444;
export const editColor = 0xdd6d0c;

export default [
	{
		event: "messageDelete",
		async handler(message) {
			if (message.partial || shouldIgnore(message)) return;
			const channel = await getLogChannel(message.guild, LogMode.DELETES);
			if (!channel?.isTextBased()) return;

			const embed = {
				...msgDeletionEmbed(message),
				description:
					`**🗑️ Message from ${message.author} deleted in ${message.channel}**\n\n${message.content}`.substring(
						0,
						2056,
					),
				timestamp: new Date().toISOString(),
			};
			channel.send({ embeds: [embed] }).catch(console.error);
		},
	},
	{
		event: "messageDeleteBulk",
		async handler(messages) {
			const first = messages.first();
			const channel = await getLogChannel(
				first?.guild || null,
				LogMode.DELETES,
			);
			if (!channel?.isTextBased()) return;

			const embeds = messages
				.filter(
					(message): message is Message =>
						!message.partial && !shouldIgnore(message),
				)
				.map(msgDeletionEmbed);

			if (!embeds.length) return;

			channel
				.send({
					embeds: [
						{
							color: deleteColor,
							description: `**🗑️ ${embeds.length} messages bulk-deleted in ${channel}**`,
							timestamp: new Date().toISOString(),
						},
						...embeds.slice(0, 9),
					],
				})
				.catch(console.error);

			for (let i = 9; i < embeds.length; i += 10)
				channel.send({ embeds: embeds.slice(i, i + 10) }).catch(console.error);
		},
	},
	{
		event: "messageUpdate",
		async handler(oldMessage, newMessage) {
			if (oldMessage.partial || shouldIgnore(oldMessage)) return;
			const channel = await getLogChannel(oldMessage.guild, LogMode.EDITS);
			if (!channel?.isTextBased()) return;

			const { author, content: oldContent } = oldMessage;
			channel
				.send({
					embeds: [
						{
							color: editColor,
							author: {
								name: author.tag,
								icon_url: author.avatarURL() || undefined,
							},
							description:
								`**✏️ ${author} edited a [message](${newMessage.url}) in ${channel}\nPrevious message:**\n\n${oldContent}`.substring(
									0,
									2056,
								),
							timestamp: new Date().toISOString(),
						},
					],
				})
				.catch(console.error);
		},
	},
	{
		event: "roleDelete",
		handler: unwhitelistRole,
	},
] as Listener[];

/**
 * Tells if the logging system should ignore the given message.
 * @param message The message to analyse
 * @returns
 */
function shouldIgnore({ system, author, member }: Message) {
	if (!member || author.bot || system) return true;
	const whitelist = getWhitelist(member.guild);
	return member.roles.cache.some((_, id) => whitelist.includes(id));
}

/**
 * Gets the logging channel conditionally to a logging mode.
 * @param guild
 * @param requiredMode
 * @returns null if the required mode isn't met, otherwise a Promise resolving to the channel
 */
function getLogChannel(guild: Guild | null, requiredMode: LogMode) {
	if (!guild) return null;
	const config = getConfig(guild);
	if (!config?.channel || !(config.mode & requiredMode)) return null;

	return guild.channels.fetch(config.channel);
}

/**
 * Generates a deletion log for the provided message
 * @param message The message to log
 * @returns The embed
 */
function msgDeletionEmbed({ content, author, attachments }: Message): APIEmbed {
	let attachmentN = 0;
	return {
		color: deleteColor,
		author: { name: author.tag, icon_url: author.avatarURL() || undefined },
		description: content,
		fields: attachments.size
			? attachments.map(({ url }) => ({
					name: `Attachment ${++attachmentN}`,
					value: url,
			  }))
			: undefined,
	};
}
