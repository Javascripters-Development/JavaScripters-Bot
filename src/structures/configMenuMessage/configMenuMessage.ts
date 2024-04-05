import {
	MenuMessage,
	MenuMessageMessageOrInteraction,
	MenuMessageOptions,
	MenuMessageTab,
} from "menuMessage.js";
import { Events, container } from "@sapphire/framework";
import {
	type ConfigMenuMessagePropertyMapping,
	type ConfigMenuMessagePropertyOptions,
	type ConfigMenuMessagePropertyValueTypeMapping,
	type ConfigMenuMessageTab,
	type ConfigMenuMessageValidationContext,
	type ConfigMenuMessageWriteableProperty,
} from "./types.js";
import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonInteraction,
	ChannelSelectMenuBuilder,
	DiscordjsErrorCodes,
	EmbedBuilder,
	type Interaction,
	Message,
	type MessageActionRowComponentBuilder,
	ModalBuilder,
	RoleSelectMenuBuilder,
	TextInputBuilder,
	TextInputStyle,
	UserSelectMenuBuilder,
} from "discord.js";
import db from "../../db.js";
import {
	FormatMenuConfigurationValueMappedType,
	formatMenuConfigurationValue,
} from "#utils";
import { Time } from "../../utils/index.js";
import { ConfigMenuTabBuilder } from "./builders/configMenuTabBuilder.js";

interface ConfigMenuMessageCollectContext<
	T extends Record<
		string,
		| ConfigMenuMessagePropertyValueTypeMapping[keyof ConfigMenuMessagePropertyValueTypeMapping]
		| null
	>,
	U extends
		keyof ConfigMenuMessagePropertyMapping = keyof ConfigMenuMessagePropertyMapping,
	_Interaction extends Interaction = Interaction,
> {
	foundProperty: ConfigMenuMessageWriteableProperty<T, U>;
	interaction: _Interaction;
	configKey?: keyof T;
}

export interface ConfigMenuMessageOptions {
	resolveTitle: (title: string, tabTitle: string) => string;
}

/** Represents a configuration menu. */
export class ConfigMenuMessage<
	Config extends Record<
		string,
		| ConfigMenuMessagePropertyValueTypeMapping[keyof ConfigMenuMessagePropertyValueTypeMapping]
		| null
	> = Record<
		string,
		| ConfigMenuMessagePropertyValueTypeMapping[keyof ConfigMenuMessagePropertyValueTypeMapping]
		| null
	>,
> {
	/** The configuration menu title. */
	public readonly title: string;

	/** The {@link MenuMessage} instance. */
	protected menu: MenuMessage<[Config?]>;

	/** The property configurations of all tabs. */
	protected propertyConfigs: Record<string, ConfigMenuMessagePropertyOptions> =
		{};

	/** The cached config. */
	protected cachedConfig: Config = {} as Config;

	protected options: ConfigMenuMessageOptions;

	public constructor(
		title: string,
		options?: ConfigMenuMessageOptions,
		menuMessageConfig?: MenuMessageOptions,
	) {
		this.title = title;
		this.options = {
			// eslint-disable-next-line @typescript-eslint/unbound-method
			resolveTitle: (this.constructor as typeof ConfigMenuMessage).resolveTitle,
			...options,
		};
		this.menu = new MenuMessage(menuMessageConfig);
	}

	/** Check whether the instance has been initialized. */
	public get isInitialized() {
		return this.menu.isInitialized();
	}

	/**
	 * Add a tab to the menu message instance.
	 *
	 * @example
	 * const menu = new ConfigMenuMessage('Config')
	 * const tabBuilder = new ConfigMenuTabBuilder(
	 *     'tab-general',
	 *     'General',
	 *     () => ({ botPrefix: '!' }) // The current values from the database
	 * )
	 * menu.addTab(
	 *     tabBuilder.addProperty('botPrefix', {
	 *         type: 'text',
	 *         title: 'Bot prefix',
	 *         description: 'The prefix for legacy commands',
	 *         label: 'Change bot prefix',
	 *         placeholder: 'E.g: ?',
	 *         modalInputStyle: TextInputStyle.Short,
	 *         customId: 'general-bot-prefix',
	 *         async action({ values }) {
	 *             const newPrefix = values[0]
	 *             await database.configuration.set({ prefix: newPrefix })
	 *             return { botPrefix: '?' } // The updated values from the database
	 *         }
	 *     })
	 * )
	 */
	public addTab(tab: ConfigMenuTabBuilder<Config>) {
		const { tabId, title, properties, fetchConfig } = tab.data;

		if (this.menu.tabs.has(tabId))
			console.warn(
				`Tab with ID "${tabId}" will be overridden because it already exists`,
			);

		this.menu.addTab(
			tabId,
			this.createConfigMenuTab({
				title,
				properties,
				fetchConfig,
			}),
		);

		for (const [key, propertyConfig] of Object.entries(properties)) {
			if (propertyConfig.readonly) continue;

			this.propertyConfigs[key] = propertyConfig;
		}

		return this;
	}

	public addTabs(...tabs: ConfigMenuTabBuilder<Config>[]) {
		for (const tab of tabs) {
			this.addTab(tab);
		}

		return this;
	}

	/** Send the configuration menu and start listening for events. */
	public async initialize(
		messageOrInteraction: MenuMessageMessageOrInteraction,
	) {
		if (this.isInitialized) return this.menu;

		await this.menu.initialize(messageOrInteraction);

		if (this.menu.responseMessage === null)
			throw new Error("Response message not available for menu instance");

		const isMessage = messageOrInteraction instanceof Message;
		const { id: commandInvokerId } = isMessage
			? messageOrInteraction.author
			: messageOrInteraction.user;

		// Handle interactions
		const interactionCreateHandler = (interaction: Interaction) =>
			this.handleCollect(interaction, this.propertyConfigs, commandInvokerId);

		container.client.on(Events.InteractionCreate, interactionCreateHandler);

		this.menu.once("destroy", () => {
			container.client.off(Events.InteractionCreate, interactionCreateHandler);
		});

		return this.menu;
	}

	/** Generate the configuration menu tab. */
	protected createConfigMenuTab<const T extends ConfigMenuMessageTab<Config>>(
		tabConfig: T,
	): MenuMessageTab {
		return {
			label: tabConfig.title,
			tabContent: async ({ messageOrInteraction }) => {
				if (!messageOrInteraction.inGuild())
					throw new Error("Message or interaction is not in a guild");

				const config = await tabConfig.fetchConfig({
					database: db,
					messageOrInteraction,
				});

				if (config) this.cachedConfig = config;

				const configContentList: string[] = [];
				const actionRows: ActionRowBuilder<MessageActionRowComponentBuilder>[] =
					[];

				const buttonActionRow =
					new ActionRowBuilder<MessageActionRowComponentBuilder>();

				for (const [propertyName, propertyConfig] of Object.entries(
					tabConfig.properties,
				)) {
					const lastActionRow =
						actionRows.at(-1) ??
						new ActionRowBuilder<MessageActionRowComponentBuilder>();
					const isSelectMenu = ["user", "channel", "role"].includes(
						propertyConfig.type,
					);

					// Create new action row if none present yet or last one is a select menu
					const actionRow =
						isSelectMenu || !actionRows.length
							? new ActionRowBuilder<MessageActionRowComponentBuilder>()
							: lastActionRow;

					const { type, title, description, fallbackValue } = propertyConfig;
					const propertyDatabaseValue =
						config?.[propertyName as keyof typeof config] ??
						(fallbackValue as FormatMenuConfigurationValueMappedType[keyof FormatMenuConfigurationValueMappedType]);

					let configEmbedText = formatMenuConfigurationValue(
						type,
						title,
						propertyDatabaseValue,
						description,
					);

					// Prepend emoji before embed text title if no label provided
					if (
						propertyConfig.type === "boolean" &&
						propertyConfig.emoji !== undefined
					)
						configEmbedText = `${propertyConfig.emoji} ${configEmbedText}`;

					configContentList.push(configEmbedText);

					if (propertyConfig?.readonly) continue;

					const component = await this.createConfigComponent(
						propertyConfig,
						propertyDatabaseValue,
					);

					if (["boolean", "text"].includes(propertyConfig.type)) {
						buttonActionRow.addComponents(component);
						continue;
					}

					actionRow.addComponents(component);

					if (lastActionRow !== actionRow) actionRows.push(actionRow);
				}

				if (buttonActionRow.components.length) actionRows.push(buttonActionRow);

				const resolvedTitle = this.options.resolveTitle(
					this.title,
					tabConfig.title,
				);
				const embed = new EmbedBuilder()
					.setColor(tabConfig.color ?? "Blue")
					.setTitle(resolvedTitle)
					.setDescription(configContentList.join("\n\n"));

				return {
					embeds: [embed],
					components: actionRows,
				};
			},
		};
	}

	/** Create the configuration menu component. */
	protected createConfigComponent = async <
		T extends
			ConfigMenuMessageWriteableProperty<Config> = ConfigMenuMessageWriteableProperty<Config>,
	>(
		propertyConfig: T,
		propertyValue:
			| FormatMenuConfigurationValueMappedType[T["type"]]
			| null
			| undefined,
	) => {
		const builderOptions = propertyConfig.componentOptions;

		switch (propertyConfig.type) {
			case "channel":
				// biome-ignore lint/suspicious/noExplicitAny: will be the appropriate data type
				return new ChannelSelectMenuBuilder(builderOptions as any);
			case "boolean":
				// biome-ignore lint/suspicious/noExplicitAny: will be the appropriate data type
				return new ButtonBuilder(builderOptions as any);
			case "text":
				// biome-ignore lint/suspicious/noExplicitAny: will be the appropriate data type
				return new ButtonBuilder(builderOptions as any);
			case "role":
				// biome-ignore lint/suspicious/noExplicitAny: will be the appropriate data type
				return new RoleSelectMenuBuilder(builderOptions as any);
			case "user":
				// biome-ignore lint/suspicious/noExplicitAny: will be the appropriate data type
				return new UserSelectMenuBuilder(builderOptions as any);
		}
	};

	/** Handle a configuration menu interaction. */
	protected async handleCollect(
		interaction: Interaction,
		propertyConfigs: Record<string, ConfigMenuMessagePropertyOptions>,
		commandInvokerId: string,
	) {
		if (!this.menu.responseMessage)
			throw new Error("No response message available for the menu message");

		const isResponseMessageInteraction = !(
			this.menu.responseMessage instanceof Message
		);
		const responseMessageId = isResponseMessageInteraction
			? await this.menu.responseMessage.fetch().then((message) => message.id)
			: this.menu.responseMessage.id;

		// Filter out interactions on the relevant message
		if (
			!(
				interaction.isMessageComponent() &&
				interaction.message.id === responseMessageId
			)
		)
			return;

		// Check if the user is the same as the command invoker
		if (interaction.user.id !== commandInvokerId) {
			await interaction.deferUpdate();
			return;
		}

		let configKey: keyof typeof this.cachedConfig | undefined;
		let foundProperty: ConfigMenuMessageWriteableProperty<Config> | undefined;

		for (const [propertyConfigKey, propertyConfig] of Object.entries(
			propertyConfigs,
		)) {
			if (propertyConfig.readonly) continue;

			const customId =
				"customId" in propertyConfig.componentOptions
					? propertyConfig.componentOptions.customId
					: propertyConfig.componentOptions.custom_id;

			if (customId !== interaction.customId) continue;

			configKey = propertyConfigKey;
			foundProperty = propertyConfig;
		}

		// Filter out invalid interactions
		if (!foundProperty || !interaction.inCachedGuild()) return;

		let values: [string] | never[];

		// Button
		if (interaction.isButton()) {
			const buttonInteractionValues = await this.handleButtonInteraction({
				foundProperty,
				interaction,
				configKey,
			});

			if (buttonInteractionValues === undefined) return;

			values = buttonInteractionValues;
		} else {
			// User, channel or role select menu
			if (!interaction.isAnySelectMenu()) return;

			if (
				foundProperty.type !== "user" &&
				foundProperty.type !== "channel" &&
				foundProperty.type !== "role"
			)
				return;

			values = interaction.values.length ? [interaction.values[0]] : [];

			await interaction.deferUpdate();
		}

		// Handle validation
		try {
			await this.checkPropertyValidation(foundProperty, {
				interaction,
				values,
			});
		} catch (error) {
			if (!(error instanceof ConfigMenuMessageValidationError)) throw error;

			await interaction.followUp({
				content: error.message,
				ephemeral: true,
			});
			return;
		}

		type CollectPropertyValues =
			typeof foundProperty extends ConfigMenuMessageWriteableProperty<
				Config,
				"boolean"
			>
				? [string] | never[]
				: never;

		const updatedConfig = await foundProperty.action({
			database: db,
			interaction,
			values: values as CollectPropertyValues,
		});

		this.cachedConfig = updatedConfig;

		await this.menu
			.refreshTab(interaction, this.cachedConfig)
			.catch((error) => console.error(error));
	}

	protected async handleButtonInteraction({
		foundProperty,
		interaction,
		configKey,
	}: ConfigMenuMessageCollectContext<
		Config,
		"text" | "boolean",
		ButtonInteraction<"cached">
	>) {
		if (foundProperty.type === "boolean") {
			await interaction.deferUpdate();

			const updatedConfig = await foundProperty.action({
				database: db,
				interaction,
				values: [],
			});

			this.cachedConfig = updatedConfig;

			return this.menu.refreshTab(interaction, updatedConfig);
		}

		if (foundProperty.type !== "text") return;

		const customId =
			"customId" in foundProperty.componentOptions
				? foundProperty.componentOptions.customId
				: foundProperty.componentOptions.custom_id;
		const modalCustomId = `${customId}-modal-text`;
		const cachedValue = this.cachedConfig[configKey ?? ""] as string | null;
		const modalTextValue = cachedValue ?? foundProperty.value ?? "";
		const modal = new ModalBuilder()
			.setCustomId(`${customId}-modal`)
			.setTitle(foundProperty.title)
			.setComponents(
				new ActionRowBuilder<TextInputBuilder>().setComponents(
					new TextInputBuilder()
						.setLabel(foundProperty.label)
						.setCustomId(modalCustomId)
						.setPlaceholder(foundProperty.placeholder)
						.setStyle(foundProperty.modalInputStyle ?? TextInputStyle.Paragraph)
						.setValue(modalTextValue)
						.setRequired(false),
				),
			);

		await interaction.showModal(modal);

		const modalSubmitInteraction = await interaction
			.awaitModalSubmit({ time: foundProperty.modalTimeout ?? Time.Minute * 2 })
			.catch((error) => {
				// Ignore closed modal errors
				if (
					"code" in error &&
					error.code === DiscordjsErrorCodes.InteractionCollectorError &&
					error.message.includes("no interactions")
				)
					return;

				throw error;
			});

		if (modalSubmitInteraction === undefined) return;

		await modalSubmitInteraction.deferUpdate();

		return [modalSubmitInteraction.fields.getTextInputValue(modalCustomId)] as [
			string,
		];
	}

	protected async checkPropertyValidation<
		T extends ConfigMenuMessageWriteableProperty<Config>,
		U extends ConfigMenuMessageValidationContext = Parameters<
			NonNullable<T["validate"]>
		>[0],
	>(property: T, context: U) {
		const validationResult = (await property.validate?.(context)) ?? true;

		if (validationResult === true) return;

		const resolvedErrorMessage: string =
			typeof validationResult === "string"
				? validationResult
				: validationResult.summary;
		const resolvedErrorContext:
			| ConfigMenuMessageValidationErrorContext
			| undefined =
			typeof validationResult === "string"
				? undefined
				: {
						description: validationResult.description,
						hint: validationResult.hint,
				  };

		throw new ConfigMenuMessageValidationError(
			resolvedErrorMessage,
			resolvedErrorContext,
		);
	}

	/** Resolve the title of the tab. */
	protected static resolveTitle(title: string, tabTitle: string): string {
		return `${title} — ${tabTitle}`;
	}
}

export interface ConfigMenuMessageValidationErrorContext {
	description?: string;
	hint?: string;
}

/** Represents a validation error from a {@link ConfigMenuMessage} property. */
export class ConfigMenuMessageValidationError extends Error {
	public readonly context?: ConfigMenuMessageValidationErrorContext;

	constructor(
		message: string,
		context?: ConfigMenuMessageValidationErrorContext,
	) {
		super(message);

		this.context = context;
	}
}
