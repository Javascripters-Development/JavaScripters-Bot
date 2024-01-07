import { type Guild, Message, type APIEmbed } from "discord.js";
import { LogMode, getConfig } from "../commands/logging/$config.ts";
import type { Listener } from "../types/listener.ts";

export default [
	{
		event: "messageDelete",
		async handler(message) {
			const channel = await getLogChannel(message.guild, LogMode.DELETES);
			if (
				!channel?.isTextBased() ||
				message.partial ||
				message.system ||
				message.author.bot
			)
				return;

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

			const embeds = (
				await Promise.all(messages.map((msg) => msg.fetch(false)))
			)
				.filter(({ system, author }) => !system && !author.bot)
				.map(msgDeletionEmbed);

			channel
				.send({
					embeds: [
						{
							color: 0xdd4444,
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
			const channel = await getLogChannel(oldMessage.guild, LogMode.EDITS);
			if (
				!channel?.isTextBased() ||
				oldMessage.partial ||
				oldMessage.author.bot
			)
				return;

			const { author, content: oldContent } = oldMessage;
			channel
				.send({
					embeds: [
						{
							color: 0xdd6d0c,
							author: {
								name: author.tag,
								icon_url: author.avatarURL() || undefined,
							},
							description:
								`**${author} edited a [message](${newMessage.url}) in ${channel}\nPrevious message:**\n\n${oldContent}`.substring(
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
] as Listener[];

function getLogChannel(guild: Guild | null, requiredMode: LogMode) {
	if (!guild) return null;
	const config = getConfig(guild);
	if (!config?.channel || !(config.mode & requiredMode)) return null;

	return guild.channels.fetch(config.channel);
}

function msgDeletionEmbed({ content, author, attachments }: Message): APIEmbed {
	let attachmentN = 0;
	return {
		color: 0xdd4444,
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
