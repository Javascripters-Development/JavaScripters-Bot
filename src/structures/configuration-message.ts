import {
	ChatInputCommandInteraction,
	type BaseMessageOptions,
} from "discord.js";
import type {
	ConfigurationOption,
	ConfigurationStore,
	InferStoreReadContext,
} from "./configuration-manifest.ts";

/** Represents a configuration message. */
export class ConfigurationMessage<
	Store extends ConfigurationStore,
	ManifestOption extends ConfigurationOption<InferStoreReadContext<Store>>,
> {
	#store: ConfigurationStore;
	#manifest: ConfigurationOption[];

	constructor(store: Store, manifest: ManifestOption[]) {
		this.#store = store;
		this.#manifest = manifest;
	}

	/** Reply with the configuration message and listen to component interactions. */
	public initialize(interaction: ChatInputCommandInteraction) {
		const messageOptions = this.getMessageOptions();

		if (interaction.replied || interaction.deferred) {
			return interaction.editReply(messageOptions);
		}

		return interaction.reply(messageOptions);
	}

	/** Get the message options for the configuration message. */
	protected getMessageOptions(): BaseMessageOptions {
		return {};
	}
}
