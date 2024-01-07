import db from "../../db.ts";
import { Config } from "../../schemas/config.ts";
import { LoggingWhitelist } from "../../schemas/loggingWhitelist.ts";
import type { TextChannel, Guild, Role } from "discord.js";
import { eq, sql } from "drizzle-orm";
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
