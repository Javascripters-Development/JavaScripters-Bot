import { db } from "#database";
import { FnResolvable } from "#root/types/common.js";
import { MenuMessageMessageOrInteraction } from "#structures/menuMessage.js";
import {
	BuildSemanticEmbedOptions,
	FormatMenuConfigurationValueMappedType,
} from "#utils";
import {
	AutocompleteInteraction,
	Awaitable,
	ButtonStyle,
	ChannelType,
	ColorResolvable,
	Interaction,
	TextInputStyle,
	type MessageActionRowComponentBuilder,
	ButtonBuilder,
	ChannelSelectMenuBuilder,
	RoleSelectMenuBuilder,
	UserSelectMenuBuilder,
} from "discord.js";
import type { ConfigMenuMessageValidationErrorContext } from "./configMenuMessage.ts";

export interface MenuMessageHelperGetConfigContext {
	database: typeof db;
	messageOrInteraction: MenuMessageMessageOrInteraction;
}

/** The property types mapped to their TypeScript type and builder options. */
export interface ConfigMenuMessagePropertyMapping {
	boolean: [boolean, GetBuilderOptions<typeof ButtonBuilder>];
	channel: [string, GetBuilderOptions<typeof ChannelSelectMenuBuilder>];
	role: [string, GetBuilderOptions<typeof RoleSelectMenuBuilder>];
	user: [string, GetBuilderOptions<typeof UserSelectMenuBuilder>];
	text: [string, GetBuilderOptions<typeof ButtonBuilder>];
}

type GetBuilderOptions<T extends new () => MessageActionRowComponentBuilder> =
	ConstructorParameters<T>[0];

type RequireCustomId<
	T extends GetBuilderOptions<
		| typeof ButtonBuilder
		| typeof ChannelSelectMenuBuilder
		| typeof RoleSelectMenuBuilder
		| typeof UserSelectMenuBuilder
		| typeof ButtonBuilder
	>,
> = T extends { custom_id?: string }
	? Omit<T, "custom_id"> & { custom_id: string }
	: T extends { customId?: string }
	  ? Omit<T, "customId"> & { customId: string }
	  : never;

export type ConfigMenuMessagePropertyValueTypeMapping = {
	[K in keyof ConfigMenuMessagePropertyMapping]: ConfigMenuMessagePropertyMapping[K][0];
};

export type ConfigMenuMessagePropertyBuilderOptionsMapping = {
	[K in keyof ConfigMenuMessagePropertyMapping]: ConfigMenuMessagePropertyMapping[K][1];
};

export interface ConfigMenuMessageTab<
	T extends Record<
		PropertyKey,
		| ConfigMenuMessagePropertyValueTypeMapping[keyof ConfigMenuMessagePropertyValueTypeMapping]
		| null
	> = Record<
		PropertyKey,
		| ConfigMenuMessagePropertyValueTypeMapping[keyof ConfigMenuMessagePropertyValueTypeMapping]
		| null
	>,
> {
	/** The title of the tab. */
	title: string;
	/** The color of the embed. */
	color?: ColorResolvable;
	properties: Record<
		keyof T,
		ConfigMenuMessagePropertyOptions<keyof ConfigMenuMessagePropertyMapping>
	>;
	fetchConfig: (
		context: MenuMessageHelperGetConfigContext,
	) => Awaitable<T | undefined>;
}

/* Base types */

export interface ConfigMenuMessageValidationContext<
	T extends unknown[] = unknown[],
> {
	interaction: Exclude<Interaction<"cached">, AutocompleteInteraction>;
	values: readonly [...T];
}

export interface MenuMessageHelperActionContext<
	T extends unknown[] = unknown[],
> {
	database: typeof db;
	interaction: Exclude<Interaction<"cached">, AutocompleteInteraction>;
	values: readonly [...T];
}

type ConfigMenuMessageBasePropertyOptions<
	T extends keyof ConfigMenuMessagePropertyMapping,
> = {
	type: T;
	/** The title inside the embed. */
	title: string;
	/** The description inside the embed. */
	description: string;
	/** The fallback value for when the database value is undefined or nullish. */
	fallbackValue?: ConfigMenuMessagePropertyValueTypeMapping[T];
};

export interface ConfigMenuMessageWriteableProperty<
	T extends object,
	K extends
		keyof ConfigMenuMessagePropertyMapping = keyof ConfigMenuMessagePropertyMapping,
	U extends unknown[] = unknown[],
> extends ConfigMenuMessageBasePropertyOptions<K> {
	/** The options for the component. */
	componentOptions: NonNullable<
		RequireCustomId<
			NonNullable<ConfigMenuMessagePropertyBuilderOptionsMapping[K]>
		>
	>;
	/** @default false */
	readonly?: boolean;
	/**
	 * Validate the setting value before persisting it.\
	 * This function should return `true` when the value is valid else a string or {@link ConfigMenuMessagePropertyValidationError}.
	 */
	validate?: (
		context: ConfigMenuMessageValidationContext<U>,
	) => Awaitable<true | string | ConfigMenuMessagePropertyValidationError>;
	/** Persist the setting somewhere (like a database) and return the updated data for the tab. */
	action: (context: MenuMessageHelperActionContext<U>) => Awaitable<T>;
}

export interface ConfigMenuMessageReadonlyProperty<
	T extends
		keyof ConfigMenuMessagePropertyMapping = keyof ConfigMenuMessagePropertyMapping,
> extends ConfigMenuMessageBasePropertyOptions<T> {
	readonly: true;
}

export interface ConfigMenuMessagePropertyValidationError
	extends ConfigMenuMessageValidationErrorContext {
	/** A summary of the error message. */
	summary: string;
}

export interface MenuMessageHelperTextOptions<T = any>
	extends MenuMessageHelperButtonOptions<
		T,
		[string | undefined | null],
		[string]
	> {
	type: "text";
	/** Label of the modal. */
	label: string;
	/** Placeholder of the modal. */
	placeholder: string;
	modalInputStyle?: TextInputStyle;
	/**
	 * Time to listen for modal submit in milliseconds.
	 * @default
	 * Time.Minute * 2
	 */
	modalTimeout?: number;
	value?: string;
	style?: Exclude<ButtonStyle, ButtonStyle.Link>;
}

export type ConfigMenuMessagePropertyOptions<
	T extends
		keyof ConfigMenuMessagePropertyMapping = keyof ConfigMenuMessagePropertyMapping,
> = ConfigMenuMessageWriteableProperty<T> | ConfigMenuMessageReadonlyProperty;
