import {
	Colors,
	EmbedBuilder,
	GuildMember,
	type PartialGuildMember,
	userMention,
} from "discord.js";
import type { Listener } from "../types/listener.ts";
import { Config } from "../schemas/config.ts";
import db from "../db.ts";
import { eq } from "drizzle-orm";

const getTargetChannel = async (member: GuildMember | PartialGuildMember) => {
	const firstRow = await db
		.select({
			gatewayChannel: Config.gatewayChannel,
		})
		.from(Config)
		.where(eq(Config.id, member.guild.id))
		.get();

	if (!firstRow?.gatewayChannel) return undefined;

	const targetChannel = await member.guild.channels.fetch(
		firstRow.gatewayChannel,
	);

	if (!targetChannel?.isTextBased()) {
		console.error("Gateway channel is not a text channel!");
		return undefined;
	}

	return targetChannel;
};

const getEmbed = async (guildId: string, isLeaveEmbed?: boolean) => {
	const { title, description } =
		(await db
			.select({
				title: isLeaveEmbed
					? Config.gatewayLeaveTitle
					: Config.gatewayJoinTitle,
				description: isLeaveEmbed
					? Config.gatewayLeaveContent
					: Config.gatewayJoinContent,
			})
			.from(Config)
			.where(eq(Config.id, guildId))
			.get()) ?? {};

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
			const targetChannel = await getTargetChannel(member);

			if (!targetChannel) return;

			await targetChannel.send({
				content: `Welcome ${userMention(member.id)}!`,
				embeds: [await getEmbed(member.guild.id)],
			});
		},
	},
	{
		event: "guildMemberRemove",
		async handler(member) {
			const targetChannel = await getTargetChannel(member);

			if (!targetChannel) return;

			await targetChannel.send({
				embeds: [await getEmbed(member.guild.id, true)],
			});
		},
	},
] as Listener[];
