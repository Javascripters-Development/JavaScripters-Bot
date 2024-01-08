import db from "../../db.ts";
import { Config } from "../../schemas/config.ts";
import { LoggingWhitelist } from "../../schemas/loggingWhitelist.ts";
import type { TextChannel, Guild, Role } from "discord.js";
import { eq, and, sql } from "drizzle-orm";
const { placeholder } = sql;

export enum LogMode {
	NONE = 0,
	DELETES = 1 << 0,
	EDITS = 1 << 1,
	"DELETES & EDITS" = DELETES | EDITS,
}

export type LogConfig =
	| {
			mode: LogMode.NONE;
			channel: null;
	  }
	| {
			mode: LogMode;
			channel: TextChannel["id"];
	  };

const logModes = new Map<Guild["id"], LogConfig>();
db.select()
	.from(Config)
	.then((configs) => {
		for (const { id, loggingMode, loggingChannel } of configs)
			logModes.set(id, {
				mode: loggingMode || LogMode.NONE,
				channel: loggingChannel,
			});
	});

export function setLogging(
	{ id }: Guild,
	config: LogMode.NONE | { mode: LogMode; channel: TextChannel },
) {
	let loggingMode = LogMode.NONE;
	let loggingChannel = null;
	if (config) {
		loggingMode = config.mode;
		loggingChannel = config.channel.id;
		logModes.set(id, { mode: config.mode, channel: loggingChannel });
	} else {
		logModes.set(id, { mode: LogMode.NONE, channel: null });
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

export function getConfig({ id }: Guild) {
	return logModes.get(id);
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
	.where(
		and(
			eq(LoggingWhitelist.guildId, placeholder("guildId")),
			eq(LoggingWhitelist.roleId, placeholder("id")),
		),
	)
	.returning()
	.prepare();
