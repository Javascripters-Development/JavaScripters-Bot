import { ButtonStyle, type Interaction, ButtonInteraction } from "discord.js";
import { type SuggestionStatus, type UpdatedSuggestionStatus } from "../schemas/suggestion.ts";

export type SuggestionButtonId = (typeof BUTTON_ID)[keyof typeof BUTTON_ID];

export const BUTTON_ID = {
	ACCEPTED: "suggestion-accept",
	REJECTED: "suggestion-reject",
} as const satisfies {
	[Key in UpdatedSuggestionStatus]: string;
};

export const VOTE_BUTTON_ID = {
	UPVOTE: "suggestion-upvote",
	DOWNVOTE: "suggestion-downvote",
} as const;

export const BUTTON_ID_STATUS_MAP = {
	[BUTTON_ID.ACCEPTED]: "accept",
	[BUTTON_ID.REJECTED]: "rejected",
} as const satisfies {
	[Key in SuggestionButtonId]: string;
};

export const STATUS_BUTTON_STYLE_MAP = {
	ACCEPTED: ButtonStyle.Success,
	REJECTED: ButtonStyle.Danger,
} as const satisfies {
	[Key in UpdatedSuggestionStatus]: ButtonStyle;
};

/** Get the status as a verb. */
export const getStatusAsVerb = (status: SuggestionStatus) => {
	if (status === "ACCEPTED") return "accept";

	if (status === "REJECTED") return "reject";

	throw new Error(`"${status}" is not a valid suggestion status`);
};

/** Check if the interaction is a valid suggestion button interaction. */
export const isValidStatusButtonInteraction = (interaction: Interaction): interaction is ButtonInteraction => {
	const validButtonIds = Object.values(BUTTON_ID);

	return interaction.isButton() && validButtonIds.includes(interaction.customId as SuggestionButtonId);
};

/** Check if the interaction is a valid suggestion vote button interaction. */
export const isValidVoteButtonInteraction = (interaction: Interaction): interaction is ButtonInteraction => {
	const validButtonIds = Object.values(VOTE_BUTTON_ID);

	return (
		interaction.isButton() &&
		validButtonIds.includes(interaction.customId as (typeof VOTE_BUTTON_ID)[keyof typeof VOTE_BUTTON_ID])
	);
};
