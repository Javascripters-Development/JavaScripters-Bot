import {
	ActionRowBuilder,
	ChatInputCommandInteraction,
	ComponentType,
	DiscordjsErrorCodes,
	DiscordjsTypeError,
	InteractionResponse,
	Message,
	MessageComponentInteraction,
	StringSelectMenuBuilder,
	type BaseMessageOptions,
	type CollectedInteraction,
	type InteractionReplyOptions,
} from "discord.js";
import type { ConfigurationOption } from "./configuration-manifest.ts";
import db from "../../db.ts";
import { and, Table as DrizzleTable, SQL } from "drizzle-orm";
import { Time } from "../../utils.ts";
import { promptNewConfigurationOptionValue } from "./interaction-handlers.ts";

enum InteractionCustomId {
	MainMenu = "config-main-menu",
}

interface GetMessageOptionsContext<Table extends DrizzleTable> {
	table: Table;
	interaction:
		| ChatInputCommandInteraction<"cached" | "raw">
		| CollectedInteraction<"cached" | "raw">
		| MessageComponentInteraction<"cached" | "raw">;
}

interface ConfigurationMessageOptions<Table extends DrizzleTable = DrizzleTable> {
	/** Dynamically create the where clause for the database query. */
	getWhereClause: (context: GetMessageOptionsContext<Table>) => SQL<unknown>;
	/**
	 * How long will this configuration message be interactable.
	 *
	 * @default 600_000 // 10 minutes
	 */
	expiresInMs?: number;
}

/** Represents a configuration message. */
export class ConfigurationMessage<
	Option extends ConfigurationOption<DrizzleTable>,
	Table extends DrizzleTable = Option["table"],
> {
	/** How long the configuration message should stay alive. */
	public readonly TIMEOUT = Time.Minute * 10;

	#manifest: Option[];
	#options: ConfigurationMessageOptions<Table>;

	/** The {@link InteractionResponse} or {@link Message} for the current configuration message. */
	#reply: Message | InteractionResponse | null = null;

	#initialized = false;

	constructor(manifest: Option[], options: ConfigurationMessageOptions<Table>) {
		this.#manifest = manifest;
		this.#options = options;
	}

	/** Reply with the configuration message and listen to component interactions. */
	public async initialize(interaction: ChatInputCommandInteraction): Promise<void> {
		if (!interaction.inGuild() || this.#initialized) return;

		const messageOptions = await this.getMainMenuMessageOptions();

		await this.replyOrEdit(interaction, messageOptions);

		this.initializeListeners();
	}

	/** Stop listening to component interactions and clean up internal state. */
	public async destroy() {
		if (!this.#initialized) return;

		this.#reply = null;
	}

	/** Add the component interaction listeners. */
	private initializeListeners() {
		if (!this.#reply) throw new Error("No internal reply message or interaction response available");

		const manifestOptionMap = Object.fromEntries(
			this.#manifest.map((option) => [option.name, option as ConfigurationOption<Table>]),
		);

		const collector = this.#reply.createMessageComponentCollector({
			componentType: ComponentType.StringSelect,
			filter: async (interaction) => {
				const message = await this.getReplyMessage();
				const isReplyAuthor = message.interaction?.user.id === interaction.user.id;
				const isReplyMessage = interaction.message.id === message.id;

				if (!Object.keys(manifestOptionMap).includes(interaction.values[0])) return false;

				return isReplyAuthor && isReplyMessage;
			},
			time: this.TIMEOUT,
		});

		collector.on("collect", async (interaction) => {
			if (!interaction.inGuild()) throw new Error("Interaction happened outside a guild");

			await this.handleInteractionCollect(interaction, manifestOptionMap[interaction.values[0]]);
		});
	}

	/** Get the {@link Message} for the configuration message reply. */
	private async getReplyMessage() {
		if (!this.#reply) throw new Error("No internal reply message or interaction response available");

		return this.#reply instanceof Message ? this.#reply : await this.#reply.fetch();
	}

	private async handleInteractionCollect(
		interaction: MessageComponentInteraction<"cached" | "raw">,
		manifestOption: ConfigurationOption<Table>,
	) {
		const whereClause = this.#options.getWhereClause({
			table: manifestOption.table,
			interaction,
		});

		const { value: currentValue } = db
			.select({
				value: manifestOption.table[manifestOption.column as keyof object],
			})
			.from(manifestOption.table)
			.where(and(whereClause))
			.all()
			// TEMP: use .all() and select the first row manually, .get() does not work
			.at(0) as { value: unknown };

		let newValue: unknown;

		try {
			newValue = await promptNewConfigurationOptionValue(interaction, manifestOption, currentValue);
		} catch (error) {
			if (error instanceof DiscordjsTypeError) {
				if (
					error.code === DiscordjsErrorCodes.InteractionCollectorError &&
					error.message === "Collector received no interactions before ending with reason: time"
				) {
					// Exit early because an interaction collector timed out
					return;
				}
			}

			if (
				!(error instanceof DiscordjsTypeError && error.code === DiscordjsErrorCodes.ModalSubmitInteractionFieldNotFound)
			)
				throw error;

			// User did not provide a value, meaning the database value should be set to NULL
			newValue = null;
		}

		db.update(manifestOption.table)
			.set({ [manifestOption.column as keyof object]: newValue ? newValue : null })
			.where(whereClause)
			.run();

		await interaction.followUp({
			content: "Value updated successfully",
			ephemeral: true,
		});
	}

	/** Reply to a message or edit the reply if the interaction got replied to or is deferred and keep reply in memory. */
	private async replyOrEdit(
		interaction: ChatInputCommandInteraction,
		messageOptions: BaseMessageOptions,
	): Promise<void> {
		if (!interaction.isRepliable) return;

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
			const action = interaction.replied ? "followUp" : "reply";

			await interaction[action]({
				content: "Something went wrong... Try again later",
				ephemeral: true,
			});

			this.destroy();
		}
	}

	/** Get the main menu message options. */
	private getMainMenuMessageOptions(): InteractionReplyOptions {
		const selectMenu = new StringSelectMenuBuilder()
			.setCustomId(InteractionCustomId.MainMenu)
			.setPlaceholder("Select a configuration option")
			.setMaxValues(1);

		for (const [index, { name }] of this.#manifest.entries()) {
			selectMenu.addOptions({
				label: `${index + 1}. ${name}`,
				value: name,
			});
		}

		return {
			content: "Select which configuration option you want to view/edit:",
			components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu)],
			ephemeral: true,
		};
	}
}
