import type { InferSelectModel, Table as DrizzleTable } from "drizzle-orm";
import type { Channel, Role, TextInputStyle } from "discord.js";
import { DatabaseStore } from "./database-store.ts";

interface ConfigurationOptionTypeMap {
	text: string;
	boolean: boolean;
	role: Role;
	channel: Channel;
	select: string;
}

export type ConfigurationOptionType = keyof ConfigurationOptionTypeMap;

type ConfigurationOptionValidateFn<T = unknown> = (
	value: T,
) => boolean | string;
type ConfigurationOptionToStoreFn<T = unknown> = (value: T) => unknown;
type ConfigurationOptionFromStoreFn<T = unknown> = (value: unknown) => T;

/** Represents a data storage. */
// biome-ignore lint/suspicious/noExplicitAny: context type will be decided by the store
export abstract class ConfigurationStore<W = any, R = any> {
	/** Write data to the store. */
	abstract write(context: W): void | Promise<void>;
	/** Read data from the store. */
	abstract read(context: R): unknown | Promise<unknown>;
}

/** Helper type to extract the read context from the {@link ConfigurationStore}. */
export type InferStoreReadContext<T extends ConfigurationStore> = Parameters<
	T["read"]
>[0];

interface PartialConfigurationOption<
	T extends ConfigurationOptionType = "text",
	U = unknown,
> {
	name: string;
	description: string;
	/** @default 'text' */
	type?: T;
	/** Validate the input, validation succeeds when `true` is returned. */
	validate?: ConfigurationOptionValidateFn<ConfigurationOptionTypeMap[T]>;
	/** Transform value when persisting to the store. */
	toStore?: ConfigurationOptionToStoreFn<ConfigurationOptionTypeMap[T]>;
	/** Transform value when retrieving from the store. */
	fromStore?: ConfigurationOptionFromStoreFn<ConfigurationOptionTypeMap[T]>;
	/** The context to pass to the {@link ConfigurationStore}. */
	storeContext: U;
}

export interface ConfigurationTextOption<U = unknown>
	extends PartialConfigurationOption<"text", U> {
	type: "text";
	placeholder?: string;
	/**
	 * Which type of text input to display in the modal.
	 *
	 * @default TextInputStyle.Short
	 */
	style?: TextInputStyle;
}

export interface ConfigurationBooleanOption<U = unknown>
	extends PartialConfigurationOption<"boolean", U> {
	type: "boolean";
}

export interface ConfigurationRoleOption<U = unknown>
	extends PartialConfigurationOption<"role", U> {
	type: "role";
}

export interface ConfigurationChannelOption<U = unknown>
	extends PartialConfigurationOption<"channel", U> {
	type: "channel";
}

export interface ConfigurationSelectOption<U = unknown>
	extends PartialConfigurationOption<"select", U> {
	type: "select";
	options: {
		name: string;
		value: string;
	}[];
}

export type ConfigurationOption<U = unknown> =
	| ConfigurationTextOption<U>
	| ConfigurationBooleanOption<U>
	| ConfigurationRoleOption<U>
	| ConfigurationChannelOption<U>
	| ConfigurationSelectOption<U>;

type OmitUnion<T, K extends keyof T> = T extends object ? Omit<T, K> : never;

export type ConfigurationOptionPartial<
	T extends string,
	U extends ConfigurationStore,
> = OmitUnion<ConfigurationOption<InferStoreReadContext<U>>, "storeContext"> & {
	column: T;
};

/** Create a configuration manifest for {@link DatabaseStore}. */
export const createDatabaseConfigurationManifest = <
	Table extends DrizzleTable,
	Option extends ConfigurationOptionPartial<
		keyof InferSelectModel<Table>,
		DatabaseStore
	>,
>(
	table: Table,
	options: Option[],
) => {
	return options.map(
		(option) =>
			({
				...option,
				storeContext: {
					table,
					columns: [option.column],
				},
			}) as ConfigurationOption<InferStoreReadContext<DatabaseStore>>,
	);
};
