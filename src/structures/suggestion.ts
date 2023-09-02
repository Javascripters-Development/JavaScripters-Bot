import {
	GuildMember,
	type Snowflake,
	User,
	EmbedBuilder,
	Message,
	type GuildTextBasedChannel,
	messageLink,
} from "discord.js";
import { Votable } from "./votable.ts";
import {
	Suggestion as DbSuggestion,
	type SuggestionSelectWithVotes,
	type SuggestionStatus,
} from "../schemas/suggestion.ts";
import db from "../db.ts";
import { and, eq } from "drizzle-orm";
import { SuggestionVotes } from "../schemas/suggestionVotes.ts";
import { SuggestionManager } from "./managers/suggestionManager.ts";
import { client } from "../client.ts";
import type { ConfigSelect } from "../schemas/config.ts";
import { SuggestionUtil } from "./suggestionUtil.ts";

export const SUGGESTION_USER_ALREADY_VOTED = "UserAlreadyVoted";

interface CreateSuggestionOptions {
	title: string;
	description?: string;
	channel: GuildTextBasedChannel;
	member: GuildMember;
	dbConfig?: ConfigSelect;
}

export class Suggestion extends Votable<Snowflake> {
	/** The maximum length for the suggestion title. */
	public static readonly MAX_TITLE_LENGTH = 100;

	/** The maximum length for the suggestion description. */
	public static readonly MAX_DESCRIPTION_LENGTH = 2000;

	/** The maximum length for the status reason. */
	public static readonly MAX_REASON_LENGTH = 2000;

	constructor(private readonly raw: SuggestionSelectWithVotes) {
		const upvotedUserIds = raw.votes
			.filter((vote) => vote.isUpvote === true)
			.map((vote) => vote.userId);
		const downvotedUserIds = raw.votes
			.filter((vote) => vote.isUpvote === false)
			.map((vote) => vote.userId);

		super(upvotedUserIds, downvotedUserIds);
	}

	/** Upvote the suggestion. */
	public async upvote(userId: string): Promise<void> {
		if (this.hasUpdatedStatus()) return;

		super.upvote(userId);

		await db
			.insert(SuggestionVotes)
			.values({
				suggestionId: this.raw.id,
				userId,
				isUpvote: true,
			})
			.onConflictDoUpdate({
				target: [SuggestionVotes.suggestionId, SuggestionVotes.userId],
				where: and(
					eq(SuggestionVotes.suggestionId, this.raw.id),
					eq(SuggestionVotes.userId, userId),
				),
				set: {
					isUpvote: true,
					updatedAt: new Date(),
				},
			});

		const voteIndex = this.raw.votes.findIndex(
			(vote) => vote.userId === userId,
		);

		this.raw.votes[voteIndex].isUpvote = true;
	}

	/** Downvote the suggestion. */
	public async downvote(userId: string): Promise<void> {
		if (this.hasUpdatedStatus()) return;

		super.downvote(userId);

		await db
			.insert(SuggestionVotes)
			.values({
				suggestionId: this.raw.id,
				userId,
				isUpvote: false,
			})
			.onConflictDoUpdate({
				target: [SuggestionVotes.suggestionId, SuggestionVotes.userId],
				where: and(
					eq(SuggestionVotes.suggestionId, this.raw.id),
					eq(SuggestionVotes.userId, userId),
				),
				set: {
					isUpvote: false,
					updatedAt: new Date(),
				},
			});

		const voteIndex = this.raw.votes.findIndex(
			(vote) => vote.userId === userId,
		);

		this.raw.votes[voteIndex].isUpvote = false;
	}

	/** Remove the user's vote for the suggestion. */
	public async removeVote(userId: string): Promise<void> {
		await db.delete(DbSuggestion).where(eq(DbSuggestion.id, this.raw.id));
		super.removeVote(userId);
	}

	/** Set the status of the suggestion. */
	public async setStatus(
		user: User,
		status: SuggestionStatus,
		reason?: string,
	): Promise<void> {
		this.raw.statusUserId = user.id;
		this.raw.status = status;
		this.raw.statusReason = reason ?? null;
		this.raw.updatedAt = new Date();

		await db.update(DbSuggestion).set({
			statusUserId: this.raw.statusUserId,
			status: this.raw.status,
			statusReason: this.raw.statusReason,
			updatedAt: this.raw.updatedAt,
		});
	}

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

	/** Type-guard that checks whether the suggestion status has been updated and is not `"POSTED"`. */
	public hasUpdatedStatus(): boolean {
		return this.status !== "POSTED";
	}

	get id(): number {
		return this.raw.id;
	}

	get title(): string {
		return this.raw.title;
	}

	get description(): string | null {
		return this.raw.description;
	}

	get status(): SuggestionStatus {
		return this.raw.status;
	}

	get statusReason(): string | null {
		return this.raw.statusReason;
	}

	get upvotes(): number {
		return this.raw.votes.filter((vote) => vote.isUpvote === true).length;
	}

	get downvotes(): number {
		return this.raw.votes.filter((vote) => vote.isUpvote === false).length;
	}

	get updatedAt(): Date {
		return this.raw.updatedAt;
	}

	get createdAt(): Date {
		return this.raw.createdAt;
	}

	get messageUrl(): `https://discord.com/channels/@me/${string}/${string}` {
		return messageLink(this.raw.channelId, this.raw.messageId);
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
}
