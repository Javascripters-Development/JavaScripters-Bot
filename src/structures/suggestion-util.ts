import {
	ButtonStyle,
	type BaseMessageOptions,
	type EmbedData,
	time,
	italic,
	EmbedBuilder,
	Colors,
	ButtonBuilder,
	ActionRowBuilder,
	type Interaction,
	ButtonInteraction,
	Message,
} from "discord.js";
import {
	type SuggestionSelect,
	type SuggestionStatus,
	type UpdatedSuggestionStatus,
	Suggestion as DbSuggestion
} from "../schemas/suggestion.ts";
import type { ConfigSelect } from "../schemas/config.ts";
import { capitalizeFirstLetter } from "../utils.ts";
import { client } from "../client.ts";
import { Suggestion } from "./suggestion.ts";
import db from "../db.ts";
import { and, eq, sql } from "drizzle-orm";

const FIND_BY_ID_STATEMENT = db.query.Suggestion.findMany({
	where: eq(DbSuggestion.id, sql.placeholder("id")),
}).prepare();

const FIND_BY_MESSAGE_STATEMENT = db.query.Suggestion.findMany({
	where: and(eq(DbSuggestion.channelId, sql.placeholder("channelId")), eq(DbSuggestion.messageId, sql.placeholder("messageId"))),
}).prepare();

/** Get a {@link DiscordSuggestion} by its ID. */
export const getSuggestionFromId = async (id: number): Promise<Suggestion> => {
	const foundSuggestion = (await FIND_BY_ID_STATEMENT.all({ id })).at(0);

	if (!foundSuggestion)
		throw new Error(`Could not fetch suggestion with ID ${id}`);

	return new Suggestion(foundSuggestion.id);
}

/** Get a {@link DiscordSuggestion} from the associated {@link Message}. */
export const getSuggestionFromMessage = async ({ id, channelId, url }: Message): Promise<Suggestion> => {
	const foundSuggestion = (await FIND_BY_MESSAGE_STATEMENT.all({ channelId: channelId, messageId: id })).at(0);

	if (!foundSuggestion)
		throw new Error(
			`Could not find a suggestion associated with message ${url}`,
		);

	return new Suggestion(foundSuggestion.id);
}

export type SuggestionButtonId =
	typeof SuggestionUtil.BUTTON_ID[keyof typeof SuggestionUtil.BUTTON_ID];

export const SuggestionUtil = {
	get BUTTON_ID() {
		return {
			ACCEPTED: "suggestion-accept",
			REJECTED: "suggestion-reject",
		} as const satisfies {
			[Key in UpdatedSuggestionStatus]: string;
		};
	},

	get VOTE_BUTTON_ID() {
		return {
			UPVOTE: "suggestion-upvote",
			DOWNVOTE: "suggestion-downvote",
		} as const;
	},

	get BUTTON_ID_STATUS_MAP() {
		return {
			[this.BUTTON_ID.ACCEPTED]: "accept",
			[this.BUTTON_ID.REJECTED]: "rejected",
		} as const satisfies {
			[Key in SuggestionButtonId]: string;
		};
	},

	get STATUS_BUTTON_STYLE_MAP() {
		return {
			ACCEPTED: ButtonStyle.Success,
			REJECTED: ButtonStyle.Danger,
		} as const satisfies {
			[Key in UpdatedSuggestionStatus]: ButtonStyle;
		};
	},

	getStatusVerb(status: SuggestionStatus) {
		if (status === "ACCEPTED")
			return "accept";
		
		if (status === "REJECTED")
			return "reject";
		

		throw new Error(`"${status}" is not a valid suggestion status`);
	},

	/** Get the message options for the suggestion. */
	async getMessageOptions(
		suggestion: SuggestionSelect,
		dbConfig?: ConfigSelect,
	): Promise<BaseMessageOptions> {
		const { title, description, status, statusReason, userId, statusUserId, upvotedBy, downvotedBy } = suggestion;

		const user = await client.users.fetch(userId);
		const statusUser = statusUserId ? await client.users.fetch(statusUserId) : null;
		const hasUpdatedStatus = Boolean(statusUser)

		const fields: EmbedData["fields"] | undefined = statusUser
			? [
					{
						// biome-ignore format: doesn't need formatting
						// biome-ignore lint/style/noNonNullAssertion: user can't be null if status has been updated
						name: `${capitalizeFirstLetter(suggestion.status.toLocaleLowerCase())} by ${statusUser.username} (${time(suggestion.updatedAt, "R")})`,
						value: statusReason ?? italic("N/A"),
					},
			  ]
			: undefined;

		const author = {
			name: user.username,
			iconURL: user.displayAvatarURL() ?? undefined,
		};

		const embed = new EmbedBuilder({
			color:
				status === "ACCEPTED"
					? Colors.Green
					: status === "REJECTED"
					? Colors.Red
					: Colors.White,
			title,
			description: description ?? undefined,
			fields,
			author,
			footer: { text: `ID: ${suggestion.id}` },
		});

		const getButtonBuilder = (status: UpdatedSuggestionStatus) =>
			new ButtonBuilder({
				// biome-ignore lint/style/noNonNullAssertion: status has to be valid
				label: capitalizeFirstLetter(this.getStatusVerb(status)!),
				customId: this.BUTTON_ID[status],
				style: this.STATUS_BUTTON_STYLE_MAP[status],
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
							label: (upvotedBy ?? new Set()).size.toString(),
							emoji: dbConfig?.suggestionUpvoteEmoji ?? "👍",
							customId: this.VOTE_BUTTON_ID.UPVOTE,
							style: ButtonStyle.Primary,
							disabled: hasUpdatedStatus,
						}),
						new ButtonBuilder({
							label: (downvotedBy ?? new Set()).size.toString(),
							emoji: dbConfig?.suggestionDownvoteEmoji ?? "👎",
							customId: this.VOTE_BUTTON_ID.DOWNVOTE,
							style: ButtonStyle.Primary,
							disabled: hasUpdatedStatus,
						}),
					],
				}),
			],
		};
	},

	/** Check if the interaction is a valid suggestion button interaction. */
	isValidInteraction(
		interaction: Interaction,
	): interaction is ButtonInteraction {
		const validButtonIds = Object.values(this.BUTTON_ID);

		return (
			interaction.isButton() &&
			validButtonIds.includes(interaction.customId as SuggestionButtonId)
		);
	},

	/** Check if the interaction is a valid suggestion vote button interaction. */
	isValidVoteInteraction(
		interaction: Interaction,
	): interaction is ButtonInteraction {
		const validButtonIds = Object.values(this.VOTE_BUTTON_ID);

		return (
			interaction.isButton() &&
			validButtonIds.includes(
				interaction.customId as typeof this.VOTE_BUTTON_ID[keyof typeof this.VOTE_BUTTON_ID],
			)
		);
	}
};
