import db from "../db.ts";
import { GuildSchema } from "../schemas/guild.ts";

/** Ensure the guild exists in the database. */
export const ensureGuild = async (guildId: string) =>
	db.insert(GuildSchema).values({ id: guildId }).onConflictDoNothing();
