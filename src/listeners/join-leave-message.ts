import {
	Colors,
	EmbedBuilder,
	GuildMember,
	type PartialGuildMember,
	userMention,
} from "discord.js";
import type { Listener } from "../types/listener.ts";
import { getConfig } from "../utils.ts";
import type { ConfigSelect } from "../schemas/config.ts";
const getTargetChannel = async (
	dbConfig: ConfigSelect,
	member: GuildMember | PartialGuildMember,
) => {
	if (!dbConfig?.gatewayChannel) return undefined;

	const targetChannel = await member.guild.channels.fetch(
		dbConfig.gatewayChannel,
	);

	if (!targetChannel?.isTextBased()) {
		console.error("Gateway channel is not a text channel!");
		return undefined;
	}

	return targetChannel;
};

const getEmbed = async (dbConfig: ConfigSelect, isLeaveEmbed?: boolean) => {
	const title = isLeaveEmbed
		? dbConfig?.gatewayLeaveTitle
		: dbConfig?.gatewayJoinTitle;
	const description = isLeaveEmbed
		? dbConfig?.gatewayLeaveContent
		: dbConfig?.gatewayJoinContent;

	return new EmbedBuilder({
		color: isLeaveEmbed ? Colors.Red : Colors.Green,
		title: title ?? undefined,
		description: description ?? undefined,
	});
};

export default [
	{
		event: "guildMemberAdd",
		async handler(member) {
			const [dbConfig] = getConfig.all({
				guildId: member.guild.id,
			});
			if (!dbConfig) {
				return;
			}

			const targetChannel = await getTargetChannel(dbConfig, member);
			if (!targetChannel) return;
			await targetChannel.send({
				content: `Welcome ${userMention(member.id)}!`,
				embeds: [await getEmbed(dbConfig)],
			});
		},
	},
	{
		event: "guildMemberRemove",
		async handler(member) {
			const [dbConfig] = getConfig.all({
				guildId: member.guild.id,
			});
			if (!dbConfig) {
				return;
			}
			const targetChannel = await getTargetChannel(dbConfig, member);

			if (!targetChannel) return;

			await targetChannel.send({
				embeds: [await getEmbed(dbConfig, true)],
			});
		},
	},
] as Listener[];
