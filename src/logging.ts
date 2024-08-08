import db from "./db.ts";
import { LogMode, type LogConfig } from "./types/logging.ts";
import { Config } from "./schemas/config.ts";
import { LoggingWhitelist } from "./schemas/loggingWhitelist.ts";
import type { TextChannel, Guild, Role } from "discord.js";
import { eq, and, sql } from "drizzle-orm";
const { placeholder } = sql;

export function setLogging({ id }: Guild, config: LogMode.NONE | { mode: LogMode; channel: TextChannel }) {
	let loggingMode = LogMode.NONE;
	let loggingChannel = null;
	if (config) {
		loggingMode = config.mode;
		loggingChannel = config.channel.id;
	}

	return db
		.insert(Config)
		.values({ id, loggingMode, loggingChannel })
		.onConflictDoUpdate({
			target: Config.id,
			set: { loggingMode, loggingChannel },
		})
		.returning();
}

export function getConfig({ id }: { id: string }): LogConfig {
	const { mode, channel } = selectConfig.all({ guildId: id })[0];
	return channel ? { mode, channel } : { mode: LogMode.NONE, channel };
}

export function getWhitelist({ id: guildId }: Guild) {
	return whitelistRoles.all({ guildId }).map(({ id }) => id);
}

export function whitelistRole({ id, guild: { id: guildId } }: Role) {
	return whitelistRole_add.execute({ guildId, id });
}

// For some reason, simply returning the execute makes the roleDelete listener not work
export async function unwhitelistRole({ id, guild: { id: guildId } }: Role) {
	return await whitelistRole_remove.execute({ guildId, id });
}

const selectConfig = db
	.select({ mode: Config.loggingMode, channel: Config.loggingChannel })
	.from(Config)
	.where(eq(Config.id, placeholder("guildId")))
	.prepare();

const whitelistRoles = db
	.select({ id: LoggingWhitelist.roleId })
	.from(LoggingWhitelist)
	.where(eq(LoggingWhitelist.guildId, placeholder("guildId")))
	.prepare();

const whitelistRole_add = db
	.insert(LoggingWhitelist)
	.values({ guildId: placeholder("guildId"), roleId: placeholder("id") })
	.onConflictDoNothing()
	.returning()
	.prepare();

const whitelistRole_remove = db
	.delete(LoggingWhitelist)
	.where(and(eq(LoggingWhitelist.guildId, placeholder("guildId")), eq(LoggingWhitelist.roleId, placeholder("id"))))
	.returning()
	.prepare();
