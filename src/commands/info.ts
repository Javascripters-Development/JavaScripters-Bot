import {
	type ChatInputCommandInteraction,
	type APIEmbed,
	ApplicationCommandType,
	channelMention,
} from "discord.js";
import type { Command } from "djs-fsrouter";

export const type = ApplicationCommandType.ChatInput;
const Info: Command = {
	description: "Get info about the bot and server",
	defaultMemberPermissions: "0",
	async run(interaction) {
		if (!interaction.guild) {
			interaction.reply({
				content: "Run this command in a server to get server info",
				ephemeral: true,
			});
			return;
		}
		const embed: APIEmbed = {
			title: "Info",
			description: `This bot is the official bot of JavaScripters, and offers tools for helping, moderation, events, and more.
JavaScripters is a well known JavaScript focused server with over 10k members`,
			fields: [
				{
					name: "Member count",
					value: `${interaction.guild?.memberCount}`,
					inline: true,
				},
				{
					name: "Owner",
					value: `<@${interaction.guild?.ownerId}>`,
					inline: true,
				},
				{
					name: "Rules channel",
					value: interaction.guild?.rulesChannelId
						? channelMention(interaction.guild?.rulesChannelId)
						: "None",
				},
				{
					name: "Created",
					value: `<t:${Math.floor(
						(interaction.guild?.createdTimestamp as number) / 1000,
					)}:d>`,
				},
			],
		};
		interaction
			.reply({
				content: "See server info below!",
				embeds: [embed],
			})
			.catch(console.error);
	},
};
export default Info;
