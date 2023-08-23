import {
	Colors,
	EmbedBuilder,
	GuildMember,
	PartialGuildMember,
	userMention,
} from "discord.js";
import { Listener } from "../listener.ts";
import { Config } from "../schemas/config.ts";
import db from "../db.ts";

const getTargetChannel = async (member: GuildMember | PartialGuildMember) => {
	if (!process.env.GATEWAY_CHANNEL)
		throw new Error("No GATEWAY_CHANNEL environment variable defined");

	const targetChannel = await member.guild.channels.fetch(
		process.env.GATEWAY_CHANNEL,
	);

	if (!targetChannel?.isTextBased()) {
		console.error("Gateway channel is not a text channel!");
		return undefined;
	}

	return targetChannel;
};

const getEmbed = async (isLeaveEmbed?: boolean) => {
	const [firstRow] = await db
		.select({
			title: isLeaveEmbed ? Config.gatewayLeaveTitle : Config.gatewayJoinTitle,
			description: isLeaveEmbed
				? Config.gatewayLeaveContent
				: Config.gatewayJoinContent,
		})
		.from(Config)
		.limit(1);

	return new EmbedBuilder({
		color: isLeaveEmbed ? Colors.Red : Colors.Green,
		title: firstRow.title ?? undefined,
		description: firstRow.description ?? undefined,
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
				embeds: [await getEmbed()],
			});
		},
	},
	{
		event: "guildMemberRemove",
		async handler(member) {
			const targetChannel = await getTargetChannel(member);

			if (!targetChannel) return;

			await targetChannel.send({
				embeds: [await getEmbed(true)],
			});
		},
	},
] as Listener[];
