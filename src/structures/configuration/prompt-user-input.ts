import {
	ActionRowBuilder,
	bold,
	ButtonBuilder,
	ButtonStyle,
	ModalBuilder,
	ModalSubmitInteraction,
	TextInputBuilder,
	TextInputStyle,
	type InteractionReplyOptions,
	type CollectedInteraction,
	type MessageComponentInteraction,
	type ModalActionRowComponentBuilder,
	ComponentType,
	ButtonInteraction,
	ChannelSelectMenuBuilder,
	ChannelSelectMenuInteraction,
	ChannelType,
	subtext,
	RoleSelectMenuBuilder,
	RoleSelectMenuInteraction,
} from "discord.js";
import type { ConfigurationOption } from "./configuration-manifest.ts";
import { sql, type Table as DrizzleTable } from "drizzle-orm";
import { Time } from "../../utils.ts";
import { getCustomId } from "./utils.ts";
import { stripIndents } from "common-tags";
import { PROMPT_TEXT_VALUE_MODAL_TIMEOUT } from "../../constants.ts";

/** The context to provide for the update value hook. */
export interface UpdateValueHookContext {
	/** The last interaction. */
	interaction: CollectedInteraction<"cached" | "raw">;
	/** The new value to set. */
	value: unknown;
	/** The {@link ConfigurationOption.type|configuration type}. */
	type: ConfigurationOption["type"];
}

/** A hook to update a database value. */
type UpdateValueHook = (context: UpdateValueHookContext) => Promise<void>;

/** Get the new value for a configuration option. */
export const promptNewConfigurationOptionValue = async (
	interaction: MessageComponentInteraction,
	manifestOption: ConfigurationOption<DrizzleTable>,
	value: unknown,
	updateValueHook: UpdateValueHook,
) => {
	switch (manifestOption.type) {
		case "text": {
			const modalInputCustomId = getCustomId(manifestOption, "modal-input");
			await promptTextValue(interaction, manifestOption, modalInputCustomId, value as string | null, updateValueHook);
			break;
		}
		case "channel":
			await promptChannelValue(interaction, manifestOption, value as string | null, updateValueHook);
			break;
		case "boolean":
			await promptBooleanValue(interaction, manifestOption, value as boolean | null, updateValueHook);
			break;
		case "role":
			await promptRoleValue(interaction, manifestOption, value as string | null, updateValueHook);
			break;
		case "select":
			throw new Error("Not yet implemented");
	}
};

/** Get the user input for a text option. */
const promptTextValue = async (
	interaction: MessageComponentInteraction,
	manifestOption: ConfigurationOption<DrizzleTable> & { type: "text" },
	modalInputCustomId: string,
	value: string | null,
	updateValueHook: UpdateValueHook,
) => {
	const modalCustomId = getCustomId(manifestOption, "modal");

	// Use a modal to get the updated value
	const modalInput = new TextInputBuilder()
		.setCustomId(modalInputCustomId)
		// TODO: add optional modalLabel property to manifest option to override this fallback
		.setLabel(manifestOption.name)
		.setValue(value ?? "")
		.setPlaceholder(manifestOption.placeholder ?? "")
		.setStyle(manifestOption.style ?? TextInputStyle.Short)
		.setRequired(manifestOption.required ?? false);

	const actionRow = new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(modalInput);
	const modal = new ModalBuilder().setTitle(manifestOption.name).setCustomId(modalCustomId).addComponents(actionRow);

	await interaction.showModal(modal);

	const modalSubmitInteraction = (await interaction.awaitModalSubmit({
		filter: (interaction) => interaction.customId === modalCustomId,
		time: PROMPT_TEXT_VALUE_MODAL_TIMEOUT,
	})) as ModalSubmitInteraction<"cached" | "raw">;

	await updateValueHook({
		interaction: modalSubmitInteraction,
		value: modalSubmitInteraction.fields.getTextInputValue(modalInputCustomId),
		type: manifestOption.type,
	});
};

/** Get the user input for a channel option. */
const promptChannelValue = async (
	interaction: MessageComponentInteraction,
	manifestOption: ConfigurationOption<DrizzleTable> & { type: "channel" },
	value: string | null,
	updateValueHook: UpdateValueHook,
) => {
	const selectMenuCustomId = getCustomId(manifestOption);
	const formattedDescription = manifestOption.description
		.split("\n")
		.map((text) => subtext(text))
		.join("\n");
	const selectMenu = new ChannelSelectMenuBuilder()
		.setCustomId(selectMenuCustomId)
		.setPlaceholder(manifestOption.placeholder ?? "Select a channel")
		.setChannelTypes(manifestOption.channelTypes ?? [ChannelType.GuildText])
		.setMinValues(0)
		.setMaxValues(1);

	if (value) selectMenu.setDefaultChannels(value);

	const messageOptions = {
		content: `${bold(manifestOption.name)}\n${formattedDescription}`,
		components: [new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(selectMenu)],
		ephemeral: true,
		fetchReply: true,
	} as const satisfies InteractionReplyOptions;

	const followUpMessage = await interaction.reply(messageOptions);

	const collector = followUpMessage.createMessageComponentCollector({
		componentType: ComponentType.ChannelSelect,
		filter: (interaction) => {
			if (!interaction.inGuild()) return false;

			return interaction.customId === selectMenuCustomId;
		},
		time: Time.Minute * 2,
	});

	collector.on("collect", async (interaction: ChannelSelectMenuInteraction<"cached" | "raw">) => {
		await updateValueHook({ interaction, value: interaction.values.at(0) ?? null, type: manifestOption.type });
	});
};

/** Get the user input for a boolean option. */
const promptBooleanValue = async (
	interaction: MessageComponentInteraction,
	manifestOption: ConfigurationOption<DrizzleTable> & { type: "boolean" },
	value: boolean | null,
	updateValueHook: UpdateValueHook,
) => {
	const buttonCustomId = getCustomId(manifestOption);
	const formattedDescription = manifestOption.description
		.split("\n")
		.map((text) => subtext(text))
		.join("\n");
	const button = new ButtonBuilder()
		.setCustomId(buttonCustomId)
		.setLabel(manifestOption.label ?? (value ? "Disable" : "Enable"))
		.setStyle(value ? ButtonStyle.Danger : ButtonStyle.Success);

	if (manifestOption.emoji) button.setEmoji(manifestOption.emoji);

	const messageOptions: InteractionReplyOptions = {
		content: stripIndents`
			${bold(manifestOption.name)}
			${formattedDescription}
		`,
		components: [new ActionRowBuilder<ButtonBuilder>().addComponents(button)],
		ephemeral: true,
	};

	const followUpInteraction = await interaction.reply(messageOptions);

	const collector = followUpInteraction.createMessageComponentCollector({
		componentType: ComponentType.Button,
		filter: (interaction) => {
			if (!interaction.inGuild()) return false;

			return interaction.customId === buttonCustomId;
		},
		time: Time.Minute * 2,
	});

	collector.on("collect", async (interaction: ButtonInteraction<"cached" | "raw">) => {
		await updateValueHook({ interaction, value: sql`NOT ${manifestOption.column}`, type: manifestOption.type });
	});
};

/** Get the user input for a role option. */
const promptRoleValue = async (
	interaction: MessageComponentInteraction,
	manifestOption: ConfigurationOption<DrizzleTable> & { type: "role" },
	value: string | null,
	updateValueHook: UpdateValueHook,
) => {
	const selectMenuCustomId = getCustomId(manifestOption);
	const formattedDescription = manifestOption.description
		.split("\n")
		.map((text) => subtext(text))
		.join("\n");
	const selectMenu = new RoleSelectMenuBuilder()
		.setCustomId(selectMenuCustomId)
		.setPlaceholder(manifestOption.placeholder ?? "Select a channel")
		.setMinValues(0)
		.setMaxValues(1);

	if (value) selectMenu.setDefaultRoles(value);

	const messageOptions = {
		content: stripIndents`
			${bold(manifestOption.name)}
			${formattedDescription}
		`,
		components: [new ActionRowBuilder<RoleSelectMenuBuilder>().addComponents(selectMenu)],
		ephemeral: true,
		fetchReply: true,
	} as const satisfies InteractionReplyOptions;

	const followUpInteraction = await interaction.reply(messageOptions);

	const collector = followUpInteraction.createMessageComponentCollector({
		componentType: ComponentType.RoleSelect,
		filter: (interaction) => {
			if (!interaction.inGuild()) return false;

			return interaction.customId === selectMenuCustomId;
		},
		time: Time.Minute * 2,
	});

	collector.on("collect", async (interaction: RoleSelectMenuInteraction<"cached" | "raw">) => {
		await updateValueHook({ interaction, value: interaction.values.at(0), type: manifestOption.type });
	});
};
