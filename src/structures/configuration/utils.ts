import type { Table } from "drizzle-orm";
import type { ConfigurationOption } from "./configuration-manifest.ts";

/**
 * Get the custom ID for a manifest option.
 *
 * @private
 */
export const getCustomId = (
	manifestOption: ConfigurationOption<Table>,
	suffix?: string,
) => {
	const _suffix = suffix ? `-${suffix}` : "";

	return `config-message-${manifestOption.column}${_suffix}`;
};
