import type { TextChannel } from "discord.js";

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
