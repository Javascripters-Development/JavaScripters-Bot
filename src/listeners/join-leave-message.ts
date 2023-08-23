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

const getDatabaseConfig = async (
	member: GuildMember | PartialGuildMember,
	isLeaveEmbed?: boolean,
) => {
	return db
		.select({
			gatewayChannel: Config.gatewayChannel,
			title: isLeaveEmbed ? Config.gatewayLeaveTitle : Config.gatewayJoinTitle,
			description: isLeaveEmbed
				? Config.gatewayLeaveContent
				: Config.gatewayJoinContent,
		})
		.from(Config)
		.where(eq(Config.id, member.guild.id))
		.get();
};

type DatabaseConfig = Awaited<ReturnType<typeof getDatabaseConfig>>;

const getTargetChannel = async (
	dbConfig: DatabaseConfig,
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

const getEmbed = async (dbConfig: DatabaseConfig, isLeaveEmbed?: boolean) => {
	return new EmbedBuilder({
		color: isLeaveEmbed ? Colors.Red : Colors.Green,
		title: dbConfig?.title ?? undefined,
		description: dbConfig?.description ?? undefined,
	});
};

export default [
	{
		event: "guildMemberAdd",
		async handler(member) {
			const dbConfig = await getDatabaseConfig(member);
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
			const dbConfig = await getDatabaseConfig(member, true);
			const targetChannel = await getTargetChannel(dbConfig, member);

			if (!targetChannel) return;

			await targetChannel.send({
				embeds: [await getEmbed(dbConfig, true)],
			});
		},
	},
] as Listener[];
