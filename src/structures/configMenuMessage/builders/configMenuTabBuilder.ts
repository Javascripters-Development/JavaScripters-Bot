import { Builder } from "../../builder.js";
import type {
	ConfigMenuMessagePropertyValueTypeMapping,
	ConfigMenuMessagePropertyOptions,
	ConfigMenuMessageTab,
} from "../types.js";

interface ConfigMenuTab<
	T extends Record<
		PropertyKey,
		| ConfigMenuMessagePropertyValueTypeMapping[keyof ConfigMenuMessagePropertyValueTypeMapping]
		| null
	>,
> extends ConfigMenuMessageTab<T> {
	tabId: string;
}

export class ConfigMenuTabBuilder<
	T extends Record<
		PropertyKey,
		| ConfigMenuMessagePropertyValueTypeMapping[keyof ConfigMenuMessagePropertyValueTypeMapping]
		| null
	>,
> extends Builder<ConfigMenuTab<T>> {
	public constructor(
		tabId: string,
		title: string,
		fetchConfig: ConfigMenuMessageTab<T>["fetchConfig"],
	) {
		super({
			tabId,
			title,
			properties: {} as Record<keyof T, ConfigMenuMessagePropertyOptions>,
			fetchConfig,
		});
	}

	/** Set the custom ID of the tab. */
	public setTabId(tabId: string) {
		this._data.tabId = tabId;

		return this;
	}

	/** Set the title of the tab. */
	public setTitle(title: string) {
		this._data.title = title;

		return this;
	}

	/** Set the fetch config callback of the tab. */
	public setFetchConfig(fetchConfig: ConfigMenuMessageTab<T>["fetchConfig"]) {
		this._data.fetchConfig = fetchConfig;

		return this;
	}

	/** Set the properties of the tab. */
	public setProperties(
		properties: Record<keyof T, ConfigMenuMessagePropertyOptions>,
	) {
		this._data.properties = properties;

		return this;
	}

	/** Set a config property. */
	public setProperty(
		propertyName: keyof T,
		propertyConfig: ConfigMenuMessagePropertyOptions,
	) {
		if (propertyName in this._data.properties)
			console.warn(
				`Property "${propertyName.toString()}" already exists and will be overridden`,
			);

		this._data.properties[propertyName] = propertyConfig;

		return this;
	}

	/** Add a config property. */
	public addProperty(
		propertyName: keyof T,
		propertyConfig: ConfigMenuMessagePropertyOptions,
	) {
		if (propertyName in this._data.properties)
			throw new Error(`Property "${propertyName.toString()}" already exists`);

		this._data.properties[propertyName] = propertyConfig;

		return this;
	}

	/** Add multiple config properties. */
	public addProperties(
		properties: Record<keyof T, ConfigMenuMessagePropertyOptions>,
	) {
		for (const [propertyName, propertyConfig] of Object.entries(properties)) {
			this.addProperty(propertyName, propertyConfig);
		}

		return this;
	}
}
