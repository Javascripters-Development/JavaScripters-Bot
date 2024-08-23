import {
	ActionRowBuilder,
	ModalBuilder,
	ModalSubmitInteraction,
	TextInputBuilder,
	TextInputStyle,
	type CollectedInteraction,
	type MessageComponentInteraction,
	type ModalActionRowComponentBuilder,
} from "discord.js";
import type { ConfigurationOption } from "./configuration-manifest.ts";
import type { Table as DrizzleTable } from "drizzle-orm";
import { Time } from "../../utils.ts";
import { getCustomId } from "./utils.ts";

/** Get the user input through a modal. */
const promptModalValue = async (
	interaction: MessageComponentInteraction,
	manifestOption: ConfigurationOption<DrizzleTable> & { type: "text" },
	modalInputCustomId: string,
	value: string | null,
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
		time: Time.Minute * 2,
	})) as ModalSubmitInteraction<"cached" | "raw">;

	return [modalSubmitInteraction, modalSubmitInteraction.fields.getTextInputValue(modalInputCustomId)] as const;
};

/** Get the new value for a configuration option. */
export const promptNewConfigurationOptionValue = async (
	interaction: MessageComponentInteraction,
	manifestOption: ConfigurationOption<DrizzleTable>,
	value: unknown,
): Promise<unknown | null> => {
	let updatedValue: unknown;
	let followUpInteraction!: CollectedInteraction<"cached" | "raw">;

	if (manifestOption.type === "text") {
		const modalInputCustomId = getCustomId(manifestOption, "modal-input");
		const [modalSubmitInteraction, newValue] = await promptModalValue(
			interaction,
			manifestOption,
			modalInputCustomId,
			value as string | null,
		);

		followUpInteraction = modalSubmitInteraction;
		updatedValue = newValue;
	}

	// Silently acknowledge user input interaction
	await followUpInteraction.deferUpdate();

	return updatedValue;
};
