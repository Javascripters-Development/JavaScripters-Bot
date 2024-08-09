import type { InferSelectModel, Table as DrizzleTable } from "drizzle-orm";
import type { Channel, Role, TextInputStyle } from "discord.js";

interface ConfigurationOptionTypeMap {
	text: string;
	boolean: boolean;
	role: Role;
	channel: Channel;
	select: string;
}

export type ConfigurationOptionType = keyof ConfigurationOptionTypeMap;

type ConfigurationOptionValidateFn<T = unknown> = (value: T) => boolean | string;
type ConfigurationOptionToDatabaseFn<T = unknown, U = unknown> = (value: U) => T;
type ConfigurationOptionFromDatabaseFn<T = unknown> = (value: T) => unknown;

interface PartialConfigurationOption<
	Type extends ConfigurationOptionType,
	Table extends DrizzleTable,
	Column extends keyof InferSelectModel<Table>,
> {
	name: string;
	description: string;
	/** @default 'text' */
	type?: Type;
	/** @default false */
	required?: boolean;
	/** Validate the input, validation succeeds when `true` is returned. */
	validate?: ConfigurationOptionValidateFn<ConfigurationOptionTypeMap[Type]>;
	/** Transform the value when persisting to the database. */
	toDatabase?: ConfigurationOptionToDatabaseFn<InferSelectModel<Table>[Column], ConfigurationOptionTypeMap[Type]>;
	/** Transform the value when retrieving from the database. */
	fromDatabase?: ConfigurationOptionFromDatabaseFn<InferSelectModel<Table>[Column]>;
	/** The table to execute queries on. */
	table: Table;
	/** The column to execute queries on. */
	column: Column;
}

interface ButtonConfigurationOption<
	Type extends ConfigurationOptionType,
	Table extends DrizzleTable,
	Column extends keyof InferSelectModel<Table>,
> extends PartialConfigurationOption<Type, Table, Column> {
	/**
	 * The label to display in the button.\
	 * **NOTE:** this will fallback to the {@link ConfigurationTextOption.name|name} property if not defined.
	 */
	label?: string;
	/** The emoji to display in the button before the {@link label}. */
	emoji?: string;
}

export interface ConfigurationTextOption<Table extends DrizzleTable, Column extends keyof InferSelectModel<Table>>
	extends ButtonConfigurationOption<"text", Table, Column> {
	type: "text";
	placeholder?: string;
	/**
	 * Which type of text input to display in the modal.
	 *
	 * @default TextInputStyle.Short
	 */
	style?: TextInputStyle;
}

export interface ConfigurationBooleanOption<Table extends DrizzleTable, Column extends keyof InferSelectModel<Table>>
	extends ButtonConfigurationOption<"boolean", Table, Column> {
	type: "boolean";
}

export interface ConfigurationRoleOption<Table extends DrizzleTable, Column extends keyof InferSelectModel<Table>>
	extends PartialConfigurationOption<"role", Table, Column> {
	type: "role";
	placeholder?: string;
}

export interface ConfigurationChannelOption<Table extends DrizzleTable, Column extends keyof InferSelectModel<Table>>
	extends PartialConfigurationOption<"channel", Table, Column> {
	type: "channel";
	placeholder?: string;
}

export interface ConfigurationSelectOption<Table extends DrizzleTable, Column extends keyof InferSelectModel<Table>>
	extends PartialConfigurationOption<"select", Table, Column> {
	type: "select";
	placeholder?: string;
	options: {
		label: string;
		value: string;
	}[];
}

export type ConfigurationOption<
	Table extends DrizzleTable = DrizzleTable,
	Column extends keyof InferSelectModel<Table> = keyof InferSelectModel<Table>,
> =
	| ConfigurationTextOption<Table, Column>
	| ConfigurationBooleanOption<Table, Column>
	| ConfigurationRoleOption<Table, Column>
	| ConfigurationChannelOption<Table, Column>
	| ConfigurationSelectOption<Table, Column>;

type OmitUnion<T, K extends keyof T> = T extends object ? Omit<T, K> : never;

/** Create a configuration manifest for {@link DatabaseStore}. */
export const createConfigurationManifest = <
	const Table extends DrizzleTable,
	const Column extends keyof InferSelectModel<Table>,
>(
	table: Table,
	options: OmitUnion<ConfigurationOption<Table, Column>, "table">[],
) => {
	return options.map((options) => ({
		table,
		...options,
	}));
};
