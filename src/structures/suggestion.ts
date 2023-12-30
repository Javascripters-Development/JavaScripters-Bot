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

	constructor(protected readonly id: number) {}

	/** Upvote the suggestion. */
	public async upvote(userId: string, dbConfig?: ConfigSelect): Promise<void> {
		if (await this.canVote()) return;

		const dbSuggestion = db
			.select({
				downvotedBy: DbSuggestion.downvotedBy,
				upvotedBy: DbSuggestion.upvotedBy,
			})
			.from(DbSuggestion)
			.where(eq(DbSuggestion.id, this.id))
			.get();

		const upvotes = new Set(dbSuggestion?.upvotedBy);
		const downvotes = new Set(dbSuggestion?.downvotedBy);

		upvotes.add(userId);
		downvotes.delete(userId);

		const updatedSuggestion = await db
			.update(DbSuggestion)
			.set({
				upvotedBy: upvotes,
				downvotedBy: downvotes,
			})
			.where(eq(DbSuggestion.id, this.id))
			.returning()
			.then(updated => updated[0]);

		this.updateMessage(dbConfig, updatedSuggestion)
	}

	/** Downvote the suggestion. */
	public async downvote(userId: string, dbConfig?: ConfigSelect): Promise<void> {
		if (await this.canVote()) return;

		const dbSuggestion = db
			.select({
				downvotedBy: DbSuggestion.downvotedBy,
				upvotedBy: DbSuggestion.upvotedBy,
			})
			.from(DbSuggestion)
			.where(eq(DbSuggestion.id, this.id))
			.get();

		const upvotes = new Set(dbSuggestion?.upvotedBy);
		const downvotes = new Set(dbSuggestion?.downvotedBy);

		upvotes.delete(userId);
		downvotes.add(userId);

		const updatedSuggestion = await db
			.update(DbSuggestion)
			.set({
				upvotedBy: upvotes,
				downvotedBy: downvotes,
			})
			.where(eq(DbSuggestion.id, this.id))
			.returning()
			.then(updated => updated[0]);

		this.updateMessage(dbConfig, updatedSuggestion)
	}

	/** Remove the user's vote for the suggestion. */
	public async removeVote(userId: string, dbConfig?: ConfigSelect): Promise<void> {
		const dbSuggestion = db
			.select({
				downvotedBy: DbSuggestion.downvotedBy,
				upvotedBy: DbSuggestion.upvotedBy,
			})
			.from(DbSuggestion)
			.where(eq(DbSuggestion.id, this.id))
			.get();

		if (!dbSuggestion) return


		const upvotes = new Set([...dbSuggestion.upvotedBy ?? []].filter(voteUserId => voteUserId !== userId))
		const downvotes = new Set([...dbSuggestion.downvotedBy ?? []].filter(voteUserId => voteUserId !== userId))

		const updatedSuggestion = await db
			.update(DbSuggestion)
			.set({
				upvotedBy: upvotes,
				downvotedBy: downvotes,
			})
			.where(eq(DbSuggestion.id, this.id))
			.returning()
			.then(updated => updated[0]);

		this.updateMessage(dbConfig, updatedSuggestion)
	}

    /** Check if the suggestion can be voted on. */
    public async canVote() {
        const dbSuggestion = await db
			.select({ status: DbSuggestion.status })
			.from(DbSuggestion)
			.where(eq(DbSuggestion.id, this.id))
			.get();

        return dbSuggestion?.status === 'POSTED'
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
			.where(eq(DbSuggestion.id, this.id))
            .returning()
            .then(updated => updated[0]);

		this.updateMessage(dbConfig, updatedSuggestion)
	}

	/** Update the suggestion's message */
	protected async updateMessage(dbConfig?: ConfigSelect, dbSuggestion?: SuggestionSelect) {
		const _dbSuggestion = dbSuggestion
			? dbSuggestion
			: db
				.select()
				.from(DbSuggestion)
				.where(eq(DbSuggestion.id, this.id))
				.all()
				.at(0)

		if (!_dbSuggestion) return

		const channel = await client.channels.fetch(_dbSuggestion.channelId)
		const suggestionMessage = channel?.isTextBased() ? await channel?.messages.fetch(_dbSuggestion.messageId) : null
		const messageOptions = await SuggestionUtil.getMessageOptions(_dbSuggestion, dbConfig);

		// Ensure the message can be edited
		if (!suggestionMessage?.editable) return;

		await suggestionMessage.edit(messageOptions);

		const hasUpdatedStatus = _dbSuggestion.status !== 'POSTED'
		const isThreadUnlocked = suggestionMessage?.thread && !suggestionMessage?.thread.locked

		// Lock thread if suggestion is accepted/rejected
		if (hasUpdatedStatus && isThreadUnlocked) {
			await suggestionMessage.thread.setLocked(
				true,
				"Suggestion got accepted or rejected",
			);
		}
	}

	toString() {
		return `Suggestion { id: ${this.id} }`
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

		return [new Suggestion(insertedRow.id), message.url];
	}
}
