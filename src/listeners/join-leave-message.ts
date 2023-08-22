import {
	Colors,
	EmbedBuilder,
	GuildMember,
	PartialGuildMember,
	userMention,
} from "discord.js";
import { createListener } from "../listener.ts";

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

export default [
	createListener({
		event: "guildMemberAdd",
		handler: async (member) => {
			const targetChannel = await getTargetChannel(member);

			if (!targetChannel) return;

			await targetChannel.send({
				content: `Welcome ${userMention(member.id)}!`,
				embeds: [
					new EmbedBuilder({
						color: Colors.Green,
						title: `Welcome to ${member.guild.name}!`,
						description: "Enjoy your stay!",
					}),
				],
			});
		},
	}),
	createListener({
		event: "guildMemberRemove",
		handler: async (member) => {
			const targetChannel = await getTargetChannel(member);

			if (!targetChannel) return;

			await targetChannel.send({
				embeds: [
					new EmbedBuilder({
						color: Colors.Red,
						title: `Goodbye ${member.user.username}!`,
					}),
				],
			});
		},
	}),
];
