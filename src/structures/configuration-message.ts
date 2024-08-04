import {
	bold,
	channelMention,
	ChatInputCommandInteraction,
	roleMention,
	type BaseMessageOptions,
} from "discord.js";
import type {
	ConfigurationOption,
	InferStoreReadContext,
} from "./configuration-manifest.ts";
import type { DatabaseStore } from "./database-store.ts";
import { Config, type ConfigSelect } from "../schemas/config.ts";
import db from "../db.ts";
import { eq, type Table } from "drizzle-orm";

/** Represents a configuration message. */
export class ConfigurationMessage<
	Store extends DatabaseStore,
	ManifestOption extends ConfigurationOption<InferStoreReadContext<Store>>,
> {
	#store: Store;
	#manifest: ConfigurationOption<InferStoreReadContext<Store>>[];

	constructor(store: Store, manifest: ManifestOption[]) {
		this.#store = store;
		this.#manifest = manifest;
	}

	/** Reply with the configuration message and listen to component interactions. */
	public async initialize(interaction: ChatInputCommandInteraction) {
		if (!interaction.inGuild()) return;

		const messageOptions = await this.getMessageOptions(interaction.guildId);

		if (interaction.replied || interaction.deferred) {
			return interaction.editReply(messageOptions);
		}

		return interaction.reply(messageOptions);
	}

	/** Get the message options for the configuration message. */
	protected async getMessageOptions(
		guildId: string,
	): Promise<BaseMessageOptions> {
		let content = "";

		const databaseValues = db
			.select()
			.from(Config)
			.where(eq(Config.id, guildId))
			.all()
			// TEMP: use .all() and select the first row manually, .get() does not work
			.at(0);

		if (!databaseValues)
			throw new Error("Could not retrieve the configuration");

		for (const manifestOption of this.#manifest) {
			const databaseValue = this.getOptionValue(
				manifestOption,
				databaseValues[
					manifestOption.storeContext.columns[0] as keyof typeof databaseValues
				],
			);

			content += `${bold(manifestOption.name)} — ${this.formatValue(
				manifestOption.type,
				databaseValue,
			)}\n`;
		}

		return {
			content: content.trim(),
		};
	}

	protected getOptionValue(
		manifestOption: ConfigurationOption<InferStoreReadContext<Store>>,
		value: unknown,
	) {
		if (manifestOption.fromStore) return manifestOption.fromStore(value);

		return value;
	}

	protected formatValue(type: ConfigurationOption["type"], value: unknown) {
		const notSetValue = "(Not set)";

		switch (type) {
			case "boolean":
				return (value as boolean) ? "Yes" : "No";
			case "channel":
				return value ? channelMention(value as string) : notSetValue;
			case "role":
				return value ? roleMention(value as string) : notSetValue;
			default:
				return value ? (value as string) : notSetValue;
		}
	}
}
