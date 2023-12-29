import { type Snowflake, User, type GuildTextBasedChannel, GuildMember, EmbedBuilder } from "discord.js";
import { Votable } from "./votable.ts";
import {
	Suggestion as DbSuggestion,
	type SuggestionSelect,
	type SuggestionStatus,
} from "../schemas/suggestion.ts";
import db from "../db.ts";
import { eq } from "drizzle-orm";
import type { ConfigSelect } from "../schemas/config.ts";
import { SuggestionUtil, getSuggestionFromId } from "./suggestion-util.ts";

export const SUGGESTION_USER_ALREADY_VOTED = "UserAlreadyVoted";

interface CreateSuggestionOptions {
	title: string;
	description?: string;
	channel: GuildTextBasedChannel;
	member: GuildMember;
	dbConfig?: ConfigSelect;
}

export class Suggestion extends Votable<Snowflake> {
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

	constructor(protected readonly id: number) {
		super();
	}

	/** Upvote the suggestion. */
	public override async upvote(userId: string): Promise<void> {
		if (await this.canVote()) return;

		super.upvote(userId);

		const dbSuggestion = await db
			.select({
				downvotedBy: DbSuggestion.downvotedBy,
				upvotedBy: DbSuggestion.upvotedBy,
			})
			.from(DbSuggestion)
			.where(eq(DbSuggestion.id, this.id))
			.get();

		const upvotes = new Set(dbSuggestion?.upvotedBy?.split(Suggestion.VOTE_SERIALIZE_SEPARATOR) ?? []);
		const downvotes = new Set(dbSuggestion?.downvotedBy?.split(Suggestion.VOTE_SERIALIZE_SEPARATOR) ?? []);

		upvotes.add(userId);
		downvotes.delete(userId);

		const serializedUpvotes = [...upvotes].join(Suggestion.VOTE_SERIALIZE_SEPARATOR) || null;
		const serializedDownvotes = [...downvotes].join(Suggestion.VOTE_SERIALIZE_SEPARATOR) || null;

		await db
			.update(DbSuggestion)
			.set({
				upvotedBy: serializedUpvotes,
				downvotedBy: serializedDownvotes,
			})
			.where(eq(DbSuggestion.id, this.id));
	}

	/** Downvote the suggestion. */
	public override async downvote(userId: string): Promise<void> {
		if (await this.canVote()) return;

		super.downvote(userId);

		const dbSuggestion = await db
			.select({
				downvotedBy: DbSuggestion.downvotedBy,
				upvotedBy: DbSuggestion.upvotedBy,
			})
			.from(DbSuggestion)
			.where(eq(DbSuggestion.id, this.id))
			.get();

		const upvotes = new Set(dbSuggestion?.upvotedBy?.split(Suggestion.VOTE_SERIALIZE_SEPARATOR) ?? []);
		const downvotes = new Set(dbSuggestion?.downvotedBy?.split(Suggestion.VOTE_SERIALIZE_SEPARATOR) ?? []);

		upvotes.delete(userId);
		downvotes.add(userId);

		const serializedUpvotes = [...upvotes].join(Suggestion.VOTE_SERIALIZE_SEPARATOR) || null;
		const serializedDownvotes = [...downvotes].join(Suggestion.VOTE_SERIALIZE_SEPARATOR) || null;

		await db
			.update(DbSuggestion)
			.set({
				upvotedBy: serializedUpvotes,
				downvotedBy: serializedDownvotes,
			})
			.where(eq(DbSuggestion.id, this.id));
	}

	/** Remove the user's vote for the suggestion. */
	public override async removeVote(userId: string): Promise<void> {
		await db.delete(DbSuggestion).where(eq(DbSuggestion.id, this.id));
		super.removeVote(userId);
	}

    /** Check if the suggestion can be voted on. */
    public override async canVote() {
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
	): Promise<SuggestionSelect> {
		return db
            .update(DbSuggestion)
            .set({
                statusUserId: user.id,
                status,
                statusReason: reason,
                updatedAt: new Date(),
            })
            .returning()
            .then(updated => updated[0]);
	}

    /** Fetch the suggestion from the database. */
    async fetch() {
        return db
			.select()
			.from(DbSuggestion)
			.where(eq(DbSuggestion.id, this.id))
			.all()
			.at(0);
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
