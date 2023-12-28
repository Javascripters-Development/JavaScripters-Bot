import {
	GuildMember,
	User,
	EmbedBuilder,
	Message,
	type GuildTextBasedChannel,
	messageLink,
} from "discord.js";
import { Suggestion as DbSuggestion } from "../schemas/suggestion.ts";
import db from "../db.ts";
import { SuggestionManager } from "./managers/suggestionManager.ts";
import { client } from "../client.ts";
import type { ConfigSelect } from "../schemas/config.ts";
import { SuggestionUtil } from "./suggestionUtil.ts";
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
	/** Get the {@link User} that made the suggestion. */
	public async getUser(): Promise<User> {
		return client.users.fetch(this.raw.userId);
	}

	/** Get the {@link User} that updated the suggestion status. */
	public async getStatusUser(): Promise<User | null> {
		if (!this.raw.statusUserId) return null;

		return client.users.fetch(this.raw.statusUserId);
	}

	/** Get the suggestion {@link Message}. */
	public async getMessage(): Promise<Message> {
		const channel = await client.channels.fetch(this.raw.channelId);

		if (!channel?.isTextBased())
			throw new Error(`Channel with ID ${channel?.id} is not text based`);

		return channel.messages.fetch(this.raw.messageId);
	}

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
		await message.edit(messageOptions);

		await message.startThread({
			name: `Suggestion: ${title}`,
			reason: `New suggestion made by ${member.user.username}`,
		});

		return suggestion;
	}

	public get messageUrl(): `https://discord.com/channels/@me/${string}/${string}` {
		return messageLink(this.raw.channelId, this.raw.messageId);
	}
}
