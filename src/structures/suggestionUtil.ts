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
import type {
	SuggestionStatus,
	SuggestionStatusWithoutPosted,
} from "../schemas/suggestion.ts";
import type { Suggestion } from "./suggestion.ts";
import type { ConfigSelect } from "../schemas/config.ts";
import { capitalizeFirstLetter } from "../utils.ts";
import { SuggestionManager } from "./managers/suggestionManager.ts";

export type SuggestionButtonId =
	typeof SuggestionUtil.BUTTON_ID[keyof typeof SuggestionUtil.BUTTON_ID];

export const SuggestionUtil = {
	get BUTTON_ID() {
		return {
			ACCEPTED: "suggestion-accept",
			REJECTED: "suggestion-reject",
		} as const satisfies {
			[Key in SuggestionStatusWithoutPosted]: string;
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
			[Key in SuggestionStatusWithoutPosted]: ButtonStyle;
		};
	},

	getStatusVerb(status: SuggestionStatus) {
		if (status === "ACCEPTED") {
			return "accept";
		} else if (status === "REJECTED") {
			return "reject";
		}

		throw new Error(`"${status}" is not a valid suggestion status`);
	},

	async getMessageOptions(
		suggestion: Suggestion,
		dbConfig?: ConfigSelect,
	): Promise<BaseMessageOptions> {
		const { title, description, status, statusReason } = suggestion;
		const user = await suggestion.getUser();
		const hasUpdatedStatus = suggestion.hasUpdatedStatus();

		const fields: EmbedData["fields"] | undefined = hasUpdatedStatus
			? [
					{
						// rome-ignore format: doesn't need formatting
						// rome-ignore lint/style/noNonNullAssertion: user can't be null if status has been updated
						name: `${capitalizeFirstLetter(suggestion.status.toLocaleLowerCase())} by ${(await suggestion.getStatusUser())!.username} (${time(suggestion.updatedAt, "R")})`,
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

		const getButtonBuilder = (status: SuggestionStatusWithoutPosted) =>
			new ButtonBuilder({
				// rome-ignore lint/style/noNonNullAssertion: status has to be valid
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
							label: suggestion.upvotes.toString(),
							emoji: dbConfig?.suggestionUpvoteEmoji ?? "👍",
							customId: this.VOTE_BUTTON_ID.UPVOTE,
							style: ButtonStyle.Primary,
							disabled: hasUpdatedStatus,
						}),
						new ButtonBuilder({
							label: suggestion.downvotes.toString(),
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

	isValidInteraction(
		interaction: Interaction,
	): interaction is ButtonInteraction {
		const validButtonIds = Object.values(this.BUTTON_ID);

		return (
			interaction.isButton() &&
			validButtonIds.includes(interaction.customId as SuggestionButtonId)
		);
	},

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
	},

	getInstanceFromMessage(message: Message): Promise<Suggestion> {
		const idRegex = /ID: (\d+)/i;
		const firstEmbed = message.embeds.at(0);
		const extractedId = firstEmbed?.footer?.text.match(idRegex)?.at(1);

		if (!extractedId)
			throw new Error(
				`Could not extract suggestion ID from message ${message.url}`,
			);

		return SuggestionManager.getFromId(parseInt(extractedId));
	},

	async updateMessage(
		suggestion: Suggestion,
		dbConfig?: ConfigSelect,
	): Promise<void> {
		const suggestionMessage = await suggestion.getMessage();
		const messageOptions = await this.getMessageOptions(suggestion, dbConfig);

		await suggestionMessage.edit(messageOptions);

		// Lock thread if suggestion is accepted/rejected
		if (suggestion.hasUpdatedStatus() && !suggestionMessage.thread?.locked) {
			await suggestionMessage.thread?.setLocked(
				true,
				"Suggestion got accepted or rejected",
			);
		}
	},
};
