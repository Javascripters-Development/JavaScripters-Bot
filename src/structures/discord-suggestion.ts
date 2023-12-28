import {
	GuildMember,
	EmbedBuilder,
	type GuildTextBasedChannel,
} from "discord.js";
import { Suggestion as DbSuggestion } from "../schemas/suggestion.ts";
import db from "../db.ts";
import { SuggestionManager } from "./managers/suggestionManager.ts";
import type { ConfigSelect } from "../schemas/config.ts";
import { SuggestionUtil } from "./suggestion-util.ts";
import { Suggestion } from "./suggestion.ts";

export const SUGGESTION_USER_ALREADY_VOTED = "UserAlreadyVoted";

interface CreateSuggestionOptions {
	title: string;
	description?: string;
	channel: GuildTextBasedChannel;
	member: GuildMember;
	dbConfig?: ConfigSelect;
}

export class DiscordSuggestion extends Suggestion {
	/** Create a new suggestion. */
	public static async create({
		title,
		description,
		channel,
		member,
		dbConfig,
	}: CreateSuggestionOptions) {
		const embed = new EmbedBuilder({
			title: `Loading suggestion from ${member.user.username}...`,
		});
		const message = await channel.send({ embeds: [embed] });

		const insertedRows = await db
			.insert(DbSuggestion)
			.values({
				title,
				description,

				guildId: member.guild.id,
				channelId: channel.id,
				messageId: message.id,
				userId: member.id,
			})
			.returning({ id: DbSuggestion.id });
		const { id } = insertedRows[0];

		const suggestion = await SuggestionManager.getFromId(id);

		const messageOptions = await SuggestionUtil.getMessageOptions(
			suggestion,
			dbConfig,
		);

		if (message.editable) await message.edit(messageOptions);

		if (!message.hasThread)
			await message.startThread({
				name: `Suggestion: ${title}`,
				reason: `New suggestion made by ${member.user.username}`,
			});

		return suggestion;
	}
}
