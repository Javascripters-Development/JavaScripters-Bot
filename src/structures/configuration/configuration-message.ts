import {
	ActionRowBuilder,
	bold,
	ButtonBuilder,
	ButtonStyle,
	channelMention,
	ChannelSelectMenuBuilder,
	ChatInputCommandInteraction,
	codeBlock,
	EmbedBuilder,
	inlineCode,
	InteractionResponse,
	italic,
	Message,
	MessageComponentInteraction,
	roleMention,
	RoleSelectMenuBuilder,
	StringSelectMenuBuilder,
	TextInputStyle,
	type APIActionRowComponent,
	type APIMessageActionRowComponent,
	type BaseMessageOptions,
	type CollectedInteraction,
	type MessageActionRowComponentBuilder,
} from "discord.js";
import type { ConfigurationOption, ConfigurationOptionType } from "./configuration-manifest.ts";
import db from "../../db.ts";
import { and, Table as DrizzleTable, SQL, type InferSelectModel } from "drizzle-orm";
import { Time } from "../../utils.ts";
import { truncate } from "../../utils/common.ts";
import { handleInteractionCollect } from "./interaction-handlers.ts";
import { getCustomId } from "./utils.ts";

interface GetMessageOptionsContext<T extends DrizzleTable> {
	table: T;
	interaction:
		| ChatInputCommandInteraction<"cached" | "raw">
		| CollectedInteraction<"cached" | "raw">
		| MessageComponentInteraction<"cached" | "raw">;
}

interface ConfigurationMessageOptions<T extends DrizzleTable = DrizzleTable> {
	/** Dynamically create the where clause for the database query. */
	getWhereClause: (context: GetMessageOptionsContext<T>) => SQL<unknown>;
	/**
	 * How long will this configuration message be interactable.
	 *
	 * @default 600_000 // 10 minutes
	 */
	expiresInMs?: number;
}

/** Represents a configuration message. */
export class ConfigurationMessage<Table extends DrizzleTable> {
	#table: Table;
	#manifest: ConfigurationOption<DrizzleTable>[];
	#options: ConfigurationMessageOptions<Table>;

	/** The {@link InteractionResponse} or {@link Message} for the current configuration message. */
	#reply: Message | InteractionResponse | null = null;

	#initialized = false;

	/** The text for configuration options that aren't set */
	#notSetText = italic("(Not set)");

	constructor(
		table: Table,
		manifest: ConfigurationOption<DrizzleTable>[],
		options: ConfigurationMessageOptions<Table>,
	) {
		this.#table = table;
		this.#manifest = manifest;
		this.#options = options;
	}

	/** Reply with the configuration message and listen to component interactions. */
	public async initialize(interaction: ChatInputCommandInteraction): Promise<void> {
		if (!interaction.inGuild() || this.#initialized) return;

		const messageOptions = await this.getMessageOptions(interaction);

		await this.replyOrEdit(interaction, messageOptions);

		await this.initializeListeners();
	}

	/** Stop listening to component interactions and clean up internal state. */
	public async destroy() {
		if (!this.#initialized) return;

		this.#reply = null;
	}

	/** Add the component interaction listeners. */
	private initializeListeners() {
		const manifestOptionMap = Object.fromEntries(this.#manifest.map((option) => [getCustomId(option), option]));

		if (!this.#reply) throw new Error("No internal reply message or interaction response available");

		const collector = this.#reply.createMessageComponentCollector({
			filter: async (interaction) => {
				const isValidCustomId = Object.keys(manifestOptionMap).includes(interaction.customId);
				const message = await this.getReplyMessage();
				const isReplyAuthor = message.author.id === interaction.user.id;

				return isValidCustomId || isReplyAuthor;
			},
			time: Time.Minute * 10,
		});

		collector.on("collect", async (interaction) => {
			if (!interaction.inGuild()) throw new Error("Interaction happened outside a guild");

			this.handleInteractionCollect(interaction, manifestOptionMap[interaction.customId]);
		});
	}

	/** Get the {@link Message} for the configuration message reply. */
	private async getReplyMessage() {
		if (!this.#reply) throw new Error("No internal reply message or interaction response available");

		return this.#reply instanceof Message ? this.#reply : this.#reply.fetch();
	}

	private async handleInteractionCollect(
		interaction: MessageComponentInteraction<"cached" | "raw">,
		manifestOption: ConfigurationOption<DrizzleTable>,
	) {
		const whereClause = this.#options.getWhereClause({
			table: this.#table,
			interaction,
		});

		const { value } = db
			.select({
				value: this.#table[manifestOption.column as keyof object],
			})
			.from(this.#table)
			.where(and(whereClause))
			.all()
			// TEMP: use .all() and select the first row manually, .get() does not work
			.at(0) as { value: unknown };

		const handleCollectResult = await handleInteractionCollect(interaction, manifestOption, value);

		if (handleCollectResult === null) return;

		const [followUpInteraction, updatedValue] = handleCollectResult;

		db.update(this.#table)
			.set({
				[manifestOption.column as keyof object]: updatedValue ? updatedValue : null,
			})
			.where(whereClause)
			.run();

		const messageOptions = await this.getMessageOptions(followUpInteraction);

		this.updateReply(messageOptions);
	}

	/** Reply to a message or edit the reply if the interaction got replied to or is deferred and keep reply in memory. */
	private async replyOrEdit(
		interaction: ChatInputCommandInteraction,
		messageOptions: BaseMessageOptions,
	): Promise<void> {
		let replyPromise: Promise<Message | InteractionResponse>;

		if (interaction.replied || interaction.deferred) {
			replyPromise = interaction.editReply(messageOptions);
		} else {
			replyPromise = interaction.reply(messageOptions);
		}

		try {
			const messageOrInteractionResponse = await replyPromise;

			this.#reply = messageOrInteractionResponse;
		} catch (error) {
			await interaction.followUp("Something went wrong... Try again later");
			this.destroy();
		}
	}

	/** Update the reply message. */
	private async updateReply(messageOptions: BaseMessageOptions): Promise<void> {
		if (!this.#reply) throw new Error("No internal reply message or interaction response available");

		this.#reply = await this.#reply.edit(messageOptions);
	}

	/** Get the action rows with components. */
	private getActionRows(): APIActionRowComponent<APIMessageActionRowComponent>[] {
		const actionRows: ActionRowBuilder<MessageActionRowComponentBuilder>[] = [new ActionRowBuilder()];

		for (const manifestOption of this.#manifest) {
			const component = this.getActionRowComponent(manifestOption);

			if (["select", "channel", "role"].includes(manifestOption.type)) {
				const row = new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(component);

				actionRows.push(row);
			} else {
				// Ensure that buttons are always in the first action row
				actionRows[0].addComponents(component);
			}
		}

		return actionRows.map((row) => row.toJSON());
	}

	/** Get the component for a manifest option. */
	private getActionRowComponent(manifestOption: ConfigurationOption<DrizzleTable>): MessageActionRowComponentBuilder {
		const customId = getCustomId(manifestOption);

		switch (manifestOption.type) {
			case "text": {
				const component = new ButtonBuilder()
					.setCustomId(customId)
					.setLabel(manifestOption.label ?? manifestOption.name)
					.setStyle(ButtonStyle.Primary);

				if (manifestOption.emoji) component.setEmoji(manifestOption.emoji);

				return component;
			}
			case "boolean": {
				const component = new ButtonBuilder()
					.setCustomId(customId)
					.setLabel(manifestOption.label ?? manifestOption.name);

				if (manifestOption.emoji) component.setEmoji(manifestOption.emoji);

				return component;
			}
			case "channel": {
				const component = new ChannelSelectMenuBuilder().setCustomId(customId).setMaxValues(1);

				// TODO: set channel type

				if (manifestOption.placeholder) component.setPlaceholder(manifestOption.placeholder);

				return component;
			}
			case "role": {
				const component = new RoleSelectMenuBuilder().setCustomId(customId).setMaxValues(1);

				if (manifestOption.placeholder) component.setPlaceholder(manifestOption.placeholder);

				return component;
			}
			case "select": {
				const component = new StringSelectMenuBuilder()
					.setCustomId(customId)
					.addOptions(manifestOption.options)
					.setMaxValues(1);

				if (manifestOption.placeholder) component.setPlaceholder(manifestOption.placeholder);

				return component;
			}
		}
	}

	/** Get the message options for the configuration message. */
	private async getMessageOptions(
		interaction: ChatInputCommandInteraction<"cached" | "raw"> | CollectedInteraction<"cached" | "raw">,
	): Promise<BaseMessageOptions> {
		let content = "";

		const whereClause = this.#options.getWhereClause({
			table: this.#table,
			interaction,
		});

		const databaseValues = db
			.select()
			.from(this.#table)
			.where(whereClause)
			.all()
			// TEMP: use .all() and select the first row manually, .get() does not work
			.at(0);

		if (!databaseValues) throw new Error("Could not retrieve the configuration");

		for (const manifestOption of this.#manifest) {
			const databaseValue = this.getOptionValue(manifestOption, databaseValues[manifestOption.column]);

			const nameFormatted = bold(manifestOption.name);
			const descriptionFormatted = italic(manifestOption.description);

			if (manifestOption.type === "text" && manifestOption.style === TextInputStyle.Paragraph) {
				const valueFormatted = databaseValue ? codeBlock(truncate(databaseValue as string, 40)) : this.#notSetText;

				content += `${nameFormatted}\n-# ${descriptionFormatted}\n${valueFormatted}\n`;
			} else {
				const valueFormatted = this.formatValue(manifestOption.type, databaseValue);

				content += `${nameFormatted} — ${valueFormatted}\n-# ${descriptionFormatted}\n\n`;
			}
		}

		const embed = new EmbedBuilder()
			.setColor("Blue")
			// Should be able to configure through the constructor
			.setTitle("Configuration")
			.setDescription(content.trim());

		return {
			embeds: [embed],
			components: this.getActionRows(),
		};
	}

	/** Get the raw or transformed (return value of {@link ConfigurationOption.fromDatabase|fromDatabase}) database value. */
	private getOptionValue<T extends ConfigurationOption<DrizzleTable>>(
		manifestOption: T,
		value: InferSelectModel<DrizzleTable>[T["column"]],
	): unknown {
		if (manifestOption.fromDatabase) return manifestOption.fromDatabase(value);

		return value;
	}

	/** Format the value to display in an embed. */
	private formatValue(type: ConfigurationOptionType, value: unknown): string {
		switch (type) {
			case "boolean": {
				if (typeof value !== "boolean") return this.#notSetText;

				return value ? "Yes" : "No";
			}
			case "channel":
				return value ? channelMention(value as string) : this.#notSetText;
			case "role":
				return value ? roleMention(value as string) : this.#notSetText;
			default:
				return value ? inlineCode(value as string) : this.#notSetText;
		}
	}
}
