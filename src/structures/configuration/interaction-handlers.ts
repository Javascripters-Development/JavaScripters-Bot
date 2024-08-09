import {
	ActionRowBuilder,
	DiscordjsError,
	DiscordjsErrorCodes,
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

/** Handle the interaction for a text option. */
const handleTextInteractionCollect = async (
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

	try {
		return (await interaction.awaitModalSubmit({
			time: Time.Minute * 2,
		})) as ModalSubmitInteraction<"cached" | "raw">;
	} catch (error) {
		// Ignore no interactions due to timeout error
		if (
			error instanceof DiscordjsError &&
			error.code === DiscordjsErrorCodes.InteractionCollectorError &&
			error.message === "Collector received no interactions before ending with reason: time"
		)
			return null;

		throw error;
	}
};

/** Handle any kind of message component interaction. */
export const handleInteractionCollect = async (
	interaction: MessageComponentInteraction,
	manifestOption: ConfigurationOption<DrizzleTable>,
	value: unknown,
): Promise<[CollectedInteraction<"cached" | "raw">, unknown] | null> => {
	let updatedValue: unknown;
	let followUpInteraction!: CollectedInteraction<"cached" | "raw">;

	if (manifestOption.type === "text") {
		const modalInputCustomId = getCustomId(manifestOption, "modal-input");
		const modalSubmitInteraction = await handleTextInteractionCollect(
			interaction,
			manifestOption,
			modalInputCustomId,
			value as string | null,
		);

		// Return early because the component timed out
		if (modalSubmitInteraction === null) return null;

		updatedValue = modalSubmitInteraction?.fields.getTextInputValue(modalInputCustomId);
		followUpInteraction = modalSubmitInteraction;
	}

	// Silently acknowledge user input interaction
	await followUpInteraction.deferUpdate();

	return [followUpInteraction, updatedValue];
};
