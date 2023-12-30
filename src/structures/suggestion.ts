import { type Snowflake, User, type GuildTextBasedChannel, GuildMember, EmbedBuilder } from "discord.js";
import {
	Suggestion as DbSuggestion,
	type SuggestionSelect,
	type SuggestionStatus,
} from "../schemas/suggestion.ts";
import db from "../db.ts";
import { eq } from "drizzle-orm";
import type { ConfigSelect } from "../schemas/config.ts";
import { SuggestionUtil } from "./suggestion-util.ts";
import { client } from "../client.ts";

export const SUGGESTION_USER_ALREADY_VOTED = "UserAlreadyVoted";

interface CreateSuggestionOptions {
	title: string;
	description?: string;
	channel: GuildTextBasedChannel;
	member: GuildMember;
	dbConfig?: ConfigSelect;
}

export class Suggestion {
	/**
	 * The maximum length for the suggestion title.
	 *
	 * @default 100
	 */
	public static readonly MAX_TITLE_LENGTH = 100;

	/**
	 * The maximum length for the suggestion description.
	 *
	 * @default 2000
	 */
	public static readonly MAX_DESCRIPTION_LENGTH = 2000;

	/**
	 * The maximum length for the status reason.
	 *
	 * @default 2000
	 */
	public static readonly MAX_REASON_LENGTH = 2000;

    public static readonly VOTE_SERIALIZE_SEPARATOR = ','

	constructor(protected raw: SuggestionSelect) {}

	/** Upvote the suggestion. */
	public async upvote(userId: string, dbConfig?: ConfigSelect): Promise<void> {
		if (!this.canVote) return;


		const upvotes = new Set(this.raw?.upvotedBy);
		const downvotes = new Set(this.raw?.downvotedBy);

		upvotes.add(userId);
		downvotes.delete(userId);

		const updatedSuggestion = await db
			.update(DbSuggestion)
			.set({
				upvotedBy: upvotes,
				downvotedBy: downvotes,
			})
			.where(eq(DbSuggestion.id, this.raw.id))
			.returning()
			.then(updated => updated[0]);

		this.raw = updatedSuggestion

		this.updateMessage(dbConfig)
	}

	/** Downvote the suggestion. */
	public async downvote(userId: string, dbConfig?: ConfigSelect): Promise<void> {
		if (!this.canVote) return;

		const upvotes = new Set(this.raw?.upvotedBy);
		const downvotes = new Set(this.raw?.downvotedBy);

		upvotes.delete(userId);
		downvotes.add(userId);

		const updatedSuggestion = await db
			.update(DbSuggestion)
			.set({
				upvotedBy: upvotes,
				downvotedBy: downvotes,
			})
			.where(eq(DbSuggestion.id, this.raw.id))
			.returning()
			.then(updated => updated[0]);

		this.raw = updatedSuggestion

		this.updateMessage(dbConfig)
	}

	/** Remove the user's vote for the suggestion. */
	public async removeVote(userId: string, dbConfig?: ConfigSelect): Promise<void> {
		const upvotes = new Set([...this.raw.upvotedBy ?? []].filter(voteUserId => voteUserId !== userId))
		const downvotes = new Set([...this.raw.downvotedBy ?? []].filter(voteUserId => voteUserId !== userId))

		const updatedSuggestion = await db
			.update(DbSuggestion)
			.set({
				upvotedBy: upvotes,
				downvotedBy: downvotes,
			})
			.where(eq(DbSuggestion.id, this.raw.id))
			.returning()
			.then(updated => updated[0]);

		this.raw = updatedSuggestion

		this.updateMessage(dbConfig)
	}

    /** Check if the suggestion can be voted on. */
    public get canVote() {
        return this.raw?.status === 'POSTED'
    }

	/** Set the status of the suggestion. */
	public async setStatus(
		user: User,
		status: SuggestionStatus,
		reason?: string,
		dbConfig?: ConfigSelect
	): Promise<void> {
		const updatedSuggestion = await db
            .update(DbSuggestion)
            .set({
                statusUserId: user.id,
                status,
                statusReason: reason ?? null,
                updatedAt: new Date(),
            })
			.where(eq(DbSuggestion.id, this.raw.id))
            .returning()
            .then(updated => updated[0]);

		this.raw = updatedSuggestion

		this.updateMessage(dbConfig)
	}

	/** The amount of upvotes. */
	get upvoteCount() {
		return this.raw.upvotedBy?.size ?? 0
	}

	/** The amount of downvotes. */
	get downvoteCount() {
		return this.raw.downvotedBy?.size ?? 0
	}

	/** Whether . */
	get hasUpdatedStatus() {
		return this.raw.status !== 'POSTED'
	}

	/** Update the suggestion's message */
	protected async updateMessage(dbConfig?: ConfigSelect) {
		const channel = await client.channels.fetch(this.raw.channelId)
		const suggestionMessage = channel?.isTextBased() ? await channel?.messages.fetch(this.raw.messageId) : null
		const messageOptions = await SuggestionUtil.getMessageOptions(this.raw, dbConfig);

		// Ensure the message can be edited
		if (!suggestionMessage?.editable) return;

		await suggestionMessage.edit(messageOptions);

		const hasUpdatedStatus = this.raw.status !== 'POSTED'
		const isThreadUnlocked = suggestionMessage?.thread && !suggestionMessage?.thread.locked

		// Lock thread if suggestion is accepted/rejected
		if (this.hasUpdatedStatus && isThreadUnlocked) {
			await suggestionMessage.thread.setLocked(
				true,
				"Suggestion got accepted or rejected",
			);
		}
	}

	toString() {
		return `Suggestion { id: ${this.raw.id}; title: ${this.raw.title} }`
	}

    /** Create a new suggestion. */
	public static async create({
		title,
		description,
		channel,
		member,
		dbConfig,
	}: CreateSuggestionOptions): Promise<[Suggestion, string]> {
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
			.returning();
		const insertedRow = insertedRows[0];

		const messageOptions = await SuggestionUtil.getMessageOptions(
			insertedRow,
			dbConfig,
		);

		if (message.editable) await message.edit(messageOptions);

		if (!message.hasThread)
			await message.startThread({
				name: `Suggestion: ${title}`,
				reason: `New suggestion made by ${member.user.username}`,
			});

		return [new Suggestion(insertedRow), message.url];
	}
}
