import {
	User,
	type GuildTextBasedChannel,
	GuildMember,
	EmbedBuilder,
	Message,
	type EmbedData,
	italic,
	Colors,
	ButtonBuilder,
	ActionRowBuilder,
	time,
	ButtonStyle,
	messageLink,
} from "discord.js";
import {
	Suggestion as DbSuggestion,
	type SuggestionSelect,
	type SuggestionStatus,
	type UpdatedSuggestionStatus,
} from "../schemas/suggestion.ts";
import db from "../db.ts";
import { and, eq, sql } from "drizzle-orm";
import type { ConfigSelect } from "../schemas/config.ts";
import { client } from "../client.ts";
import { capitalizeFirstLetter, getConfig } from "../utils.ts";
import {
	BUTTON_ID,
	STATUS_BUTTON_STYLE_MAP,
	VOTE_BUTTON_ID,
	getStatusAsVerb,
} from "./suggestion-util.ts";
import { truncate } from "../utils/common.ts";

export const SUGGESTION_USER_ALREADY_VOTED = "UserAlreadyVoted";

interface CreateSuggestionOptions {
	description: string;
	channel: GuildTextBasedChannel;
	member: GuildMember;
	dbConfig: ConfigSelect;
}

const FIND_BY_MESSAGE_STATEMENT = db.query.Suggestion.findMany({
	where: and(
		eq(DbSuggestion.channelId, sql.placeholder("channelId")),
		eq(DbSuggestion.messageId, sql.placeholder("messageId")),
	),
}).prepare();

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

	constructor(
		protected data: SuggestionSelect,
		private dbConfig: ConfigSelect,
	) {}

	/** Upvote the suggestion. */
	public async upvote(userId: string, dbConfig?: ConfigSelect): Promise<void> {
		if (!this.canVote) return;

		const upvotes = new Set(this.data?.upvotedBy);
		const downvotes = new Set(this.data?.downvotedBy);

		upvotes.add(userId);
		downvotes.delete(userId);

		const updatedSuggestion = await db
			.update(DbSuggestion)
			.set({
				upvotedBy: upvotes,
				downvotedBy: downvotes,
			})
			.where(eq(DbSuggestion.id, this.data.id))
			.returning()
			.then((updated) => updated[0]);

		this.data = updatedSuggestion;

		this.updateMessage(dbConfig);
	}

	/** Downvote the suggestion. */
	public async downvote(
		userId: string,
		dbConfig?: ConfigSelect,
	): Promise<void> {
		if (!this.canVote) return;

		const upvotes = new Set(this.data?.upvotedBy);
		const downvotes = new Set(this.data?.downvotedBy);

		upvotes.delete(userId);
		downvotes.add(userId);

		const updatedSuggestion = await db
			.update(DbSuggestion)
			.set({
				upvotedBy: upvotes,
				downvotedBy: downvotes,
			})
			.where(eq(DbSuggestion.id, this.data.id))
			.returning()
			.then((updated) => updated[0]);

		this.data = updatedSuggestion;

		this.updateMessage(dbConfig);
	}

	/** Remove the user's vote for the suggestion. */
	public async removeVote(
		userId: string,
		dbConfig?: ConfigSelect,
	): Promise<void> {
		const upvotes = new Set(
			[...(this.data.upvotedBy ?? [])].filter(
				(voteUserId) => voteUserId !== userId,
			),
		);
		const downvotes = new Set(
			[...(this.data.downvotedBy ?? [])].filter(
				(voteUserId) => voteUserId !== userId,
			),
		);

		const updatedSuggestion = await db
			.update(DbSuggestion)
			.set({
				upvotedBy: upvotes,
				downvotedBy: downvotes,
			})
			.where(eq(DbSuggestion.id, this.data.id))
			.returning()
			.then((updated) => updated[0]);

		this.data = updatedSuggestion;

		this.updateMessage(dbConfig);
	}

	/** Check if the suggestion can be voted on. */
	public get canVote() {
		return this.data?.status === "POSTED";
	}

	/** Set the status of the suggestion. */
	public async setStatus(
		user: User,
		status: SuggestionStatus,
		reason?: string,
		dbConfig?: ConfigSelect,
	): Promise<void> {
		const updatedSuggestion = await db
			.update(DbSuggestion)
			.set({
				statusUserId: user.id,
				status,
				statusReason: reason ?? null,
				updatedAt: new Date(),
			})
			.where(eq(DbSuggestion.id, this.data.id))
			.returning()
			.then((updated) => updated[0]);

		this.data = updatedSuggestion;

		this.updateMessage(dbConfig);
	}

	/** Update the suggestion's message */
	protected async updateMessage(dbConfig?: ConfigSelect) {
		const channel = await client.channels.fetch(this.data.channelId);
		const suggestionMessage = channel?.isTextBased()
			? await channel?.messages.fetch(this.data.messageId)
			: null;
		const messageOptions = await Suggestion.getMessageOptions(this);

		// Ensure the message can be edited
		if (!suggestionMessage?.editable) return;

		await suggestionMessage.edit(messageOptions);

		const isThreadUnlocked =
			suggestionMessage?.thread && !suggestionMessage?.thread.locked;

		// Lock thread if suggestion is accepted/rejected
		if (this.hasUpdatedStatus && isThreadUnlocked) {
			await suggestionMessage.thread.setLocked(
				true,
				"Suggestion got accepted or rejected",
			);
		}
	}

	toString() {
		return `Suggestion { id: ${this.data.id} }`;
	}

	get id() {
		return this.data.id;
	}

	/** The URL to the message. */
	get url() {
		const { guildId, channelId, messageId } = this.data;

		return messageLink(guildId, channelId, messageId);
	}

	/** The user ID of the user who made the suggestion. */
	get userId() {
		return this.data.userId;
	}

	get description() {
		return this.data.description;
	}

	get status() {
		return this.data.status;
	}

	/** The reason for the status update if available. */
	get statusReason() {
		return this.data.statusReason;
	}

	/** The ID of the user that updated the status. */
	get statusUserId() {
		return this.data.statusUserId;
	}

	/** The user IDs that upvoted this suggestion. */
	get upvotedBy() {
		return this.data.upvotedBy ?? new Set();
	}

	/** The user IDs that downvoted this suggestion. */
	get downvotedBy() {
		return this.data.downvotedBy ?? new Set();
	}

	get upvoteCount() {
		return this.data.upvotedBy?.size ?? 0;
	}

	get downvoteCount() {
		return this.data.downvotedBy?.size ?? 0;
	}

	/** Whether the status has been updated before. */
	get hasUpdatedStatus() {
		return this.data.status !== "POSTED";
	}

	get updatedAt() {
		return this.data.updatedAt;
	}

	get createdAt() {
		return this.data.createdAt;
	}

	/** Create a new suggestion. */
	public static async create({
		description,
		channel,
		member,
		dbConfig,
	}: CreateSuggestionOptions): Promise<Suggestion> {
		const embed = new EmbedBuilder({
			title: `Loading suggestion from ${member.user.username}...`,
		});
		const message = await channel.send({ embeds: [embed] });

		const insertedRows = await db
			.insert(DbSuggestion)
			.values({
				description,

				guildId: member.guild.id,
				channelId: channel.id,
				messageId: message.id,
				userId: member.id,
			})
			.returning();
		const insertedRow = insertedRows[0];

		const suggestion = new Suggestion(insertedRow, dbConfig);

		const messageOptions = await Suggestion.getMessageOptions(suggestion);

		if (message.editable) await message.edit(messageOptions);

		if (!message.hasThread)
			await message.startThread({
				name: truncate(description, 50),
				reason: `New suggestion made by ${member.user.username}`,
			});

		return suggestion;
	}

	/** Create the {@link Suggestion} instance from an existing suggestion {@link Message}. */
	public static async createFromMessage({
		id,
		guildId,
		channelId,
		url,
	}: Message) {
		// TEMP: use .all() and select the first row manually, .get() does not work
		const foundSuggestion = (
			await FIND_BY_MESSAGE_STATEMENT.all({
				channelId: channelId,
				messageId: id,
			})
		).at(0);

		const dbConfig = getConfig.get({ guildId });

		if (!dbConfig)
			throw new Error(`No config in the database for guild with ID ${guildId}`);

		if (!foundSuggestion)
			throw new Error(
				`Could not find a suggestion associated with message ${url}`,
			);

		return new Suggestion(foundSuggestion, dbConfig);
	}

	/** Get the message options for this suggestion. */
	private static async getMessageOptions(suggestion: Suggestion) {
		const user = await client.users.fetch(suggestion.userId);
		const statusUser = suggestion.statusUserId
			? await client.users.fetch(suggestion.statusUserId)
			: null;
		const hasUpdatedStatus = Boolean(statusUser);

		const fields: EmbedData["fields"] | undefined = statusUser
			? [
					{
						// biome-ignore format: doesn't need formatting
						name: `${capitalizeFirstLetter(suggestion.status.toLocaleLowerCase())} by ${statusUser.username} (${time(suggestion.updatedAt, "R")})`,
						value: suggestion.statusReason ?? italic("No reason provided"),
					},
			  ]
			: undefined;

		const author = {
			name: user.username,
			iconURL: user.displayAvatarURL() ?? undefined,
		};

		const embed = new EmbedBuilder({
			color:
				suggestion.status === "ACCEPTED"
					? Colors.Green
					: suggestion.status === "REJECTED"
					  ? Colors.Red
					  : Colors.White,
			description: suggestion.description ?? undefined,
			fields,
			author,
		});

		const getButtonBuilder = (status: UpdatedSuggestionStatus) =>
			new ButtonBuilder({
				// biome-ignore lint/style/noNonNullAssertion: status has to be valid
				label: capitalizeFirstLetter(getStatusAsVerb(status)!),
				customId: BUTTON_ID[status],
				style: STATUS_BUTTON_STYLE_MAP[status],
				disabled: suggestion.status === status,
			});

		return {
			embeds: [embed],
			components: [
				new ActionRowBuilder<ButtonBuilder>({
					components: [
						getButtonBuilder("ACCEPTED"),
						getButtonBuilder("REJECTED"),
					],
				}),
				new ActionRowBuilder<ButtonBuilder>({
					components: [
						new ButtonBuilder({
							label: suggestion.upvoteCount.toString(),
							emoji: suggestion.dbConfig?.suggestionUpvoteEmoji ?? "👍",
							customId: VOTE_BUTTON_ID.UPVOTE,
							style: ButtonStyle.Primary,
							disabled: hasUpdatedStatus,
						}),
						new ButtonBuilder({
							label: suggestion.downvoteCount.toString(),
							emoji: suggestion.dbConfig?.suggestionDownvoteEmoji ?? "👎",
							customId: VOTE_BUTTON_ID.DOWNVOTE,
							style: ButtonStyle.Primary,
							disabled: hasUpdatedStatus,
						}),
					],
				}),
			],
		};
	}
}
