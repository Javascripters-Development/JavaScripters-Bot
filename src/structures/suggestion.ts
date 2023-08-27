import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	Colors,
	EmbedBuilder,
	type BaseMessageOptions,
	GuildMember,
	Message,
	type EmbedData,
	type Interaction,
	ButtonInteraction,
	time,
	type EmbedAuthorData,
} from "discord.js";
import { ZERO_WIDTH_SPACE } from "../constants.ts";

export type SuggestionStatus = typeof Suggestion.BUTTON_ID_STATUS_MAP[string];

export interface SuggestionStatusOptions {
	status: SuggestionStatus;
	member: GuildMember;
	reason?: string;
}

export class Suggestion {
	public static readonly BUTTON_ID = {
		APPROVE: "suggestion-approve",
		CONSIDER: "suggestion-consider",
		REJECT: "suggestion-reject",
	};

	public static readonly BUTTON_ID_STATUS_MAP = {
		[this.BUTTON_ID.APPROVE]: "approved",
		[this.BUTTON_ID.CONSIDER]: "considering",
		[this.BUTTON_ID.REJECT]: "rejected",
	} as const;

	/** The maximum length for the suggestion title. */
	public static readonly MAX_TITLE_LENGTH = 100;

	/** The maximum length for the suggestion description. */
	public static readonly MAX_DESCRIPTION_LENGTH = 2000;

	/** The maximum length for the status reason. */
	public static readonly MAX_REASON_LENGTH = 2000;

	constructor(
		public readonly author: GuildMember | EmbedAuthorData,
		public readonly title: string,
		public readonly description?: string,
	) {}

	/** Get the {@link BaseMessageOptions} for the suggestion. */
	public getMessageOptions(status?: SuggestionStatusOptions) {
		return {
			embeds: [this.getSuggestionEmbed(this.author, status)],
			components: [this.getComponentRow()],
		} as BaseMessageOptions;
	}

	private formatStatusText({ status, member }: SuggestionStatusOptions) {
		let statusText = "";

		switch (status) {
			case "approved":
				statusText = `Approved by ${member.user.username}`;
				break;
			case "considering":
				statusText = `Considered by ${member.user.username}`;
				break;
			case "rejected":
				statusText = `Rejected by ${member.user.username}`;
				break;
		}

		return `${statusText} (${time(new Date(), "R")})`;
	}

	private getSuggestionEmbed(
		authorData: GuildMember | EmbedAuthorData,
		status?: SuggestionStatusOptions,
	) {
		const { title, description } = this;

		const fields: EmbedData["fields"] | undefined = status
			? [
					{
						name: this.formatStatusText(status),
						value: status.reason ?? ZERO_WIDTH_SPACE,
					},
			  ]
			: undefined;

		const author =
			authorData instanceof GuildMember
				? {
						name: authorData.user.username,
						iconURL: authorData.displayAvatarURL() ?? undefined,
				  }
				: authorData;

		return new EmbedBuilder({
			color: this.getStatusEmbedColor(status?.status),
			title,
			description,
			fields,
			author,
		});
	}

	private getComponentRow() {
		return new ActionRowBuilder<ButtonBuilder>({
			components: [
				new ButtonBuilder({
					label: "Approve",
					customId: Suggestion.BUTTON_ID.APPROVE,
					style: ButtonStyle.Success,
				}),
				new ButtonBuilder({
					label: "Consider",
					customId: Suggestion.BUTTON_ID.CONSIDER,
					style: ButtonStyle.Primary,
				}),
				new ButtonBuilder({
					label: "Reject",
					customId: Suggestion.BUTTON_ID.REJECT,
					style: ButtonStyle.Danger,
				}),
			],
		});
	}

	/** Creates a {@link Suggestion} instance from a message. */
	static createFromMessage(message: Message) {
		const [embed] = message.embeds;

		if (!message.member) {
			throw new Error(
				`Could not create a suggestion instance from a message because the guildmember is "${message.member}"`,
			);
		}

		return new this(
			// rome-ignore lint/style/noNonNullAssertion: <explanation>
			{ name: embed.author!.name, iconURL: embed.author?.iconURL },
			// rome-ignore lint/style/noNonNullAssertion: <explanation>
			embed.title!,
			// rome-ignore lint/style/noNonNullAssertion: <explanation>
			embed.description!,
		);
	}

	private getStatusEmbedColor(status?: SuggestionStatus) {
		switch (status) {
			case "approved":
				return Colors.Green;
			case "considering":
				return Colors.Orange;
			case "rejected":
				return Colors.Red;
			default:
				return Colors.White;
		}
	}

	/** Get the current status as verb. */
	static getStatusVerb(status: SuggestionStatus) {
		switch (status) {
			case "approved":
				return "approve";
			case "considering":
				return "consider";
			case "rejected":
				return "reject";
		}
	}

	/** Check whether the interaction is a valid. */
	static isValidInteraction(
		interaction: Interaction,
	): interaction is ButtonInteraction {
		const validButtonIds = Object.values(this.BUTTON_ID);

		return (
			interaction.isButton() && validButtonIds.includes(interaction.customId)
		);
	}
}
