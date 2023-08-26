import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	Colors,
	EmbedBuilder,
	type BaseMessageOptions,
	type GuildMember,
	Message,
	type EmbedData,
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

	constructor(
		public readonly author: GuildMember,
		public readonly title: string,
		public readonly description?: string,
	) {}

	/** Get the {@link BaseMessageOptions} for the suggestion. */
	public getMessageOptions(status?: SuggestionStatusOptions) {
		return {
			embeds: [this.getSuggestionEmbed(status)],
			components: [this.getComponentRow()],
		} as BaseMessageOptions;
	}

	private formatStatusText({ status, member }: SuggestionStatusOptions) {
		switch (status) {
			case "approved":
				return `Approved by ${member.user.username}`;
			case "considering":
				return `Considered by ${member.user.username}`;
			case "rejected":
				return `Rejected by ${member.user.username}`;
		}
	}

	private getSuggestionEmbed(status?: SuggestionStatusOptions) {
		const { author, title, description } = this;

		const fields: EmbedData["fields"] | undefined = status
			? [
					{
						name: this.formatStatusText(status),
						value: status.reason ?? ZERO_WIDTH_SPACE,
					},
			  ]
			: undefined;

		return new EmbedBuilder({
			color: Colors.White,
			title,
			description,
			fields,
			author: {
				name: author.user.username,
				icon_url: author.avatarURL() ?? undefined,
			},
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

		// rome-ignore lint/style/noNonNullAssertion: <explanation>
		return new this(message.member, embed.title!, embed.description!);
	}

	/** Get the Embed {@link Colors} for certain status. */
	static getStatusEmbedColor(status: SuggestionStatus) {
		switch (status) {
			case "approved":
				return Colors.Green;
			case "considering":
				return Colors.Orange;
			case "rejected":
				return Colors.Red;
		}
	}
}
