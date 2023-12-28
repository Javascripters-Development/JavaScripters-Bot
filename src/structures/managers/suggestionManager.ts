import db from "../../db.ts";
import { DiscordSuggestion } from "../discord-suggestion.ts";
import { Suggestion as DbSuggestion } from "../../schemas/suggestion.ts";
import { eq, sql } from "drizzle-orm";

const FIND_BY_ID_STATEMENT = db.query.Suggestion.findMany({
	where: eq(DbSuggestion.id, sql.placeholder("id")),
}).prepare();

export class SuggestionManager {
	public static async getFromId(id: number): Promise<DiscordSuggestion> {
		const foundSuggestion = (await FIND_BY_ID_STATEMENT.all({ id })).at(0);

		if (!foundSuggestion)
			throw new Error(`Could not fetch suggestion with ID ${id}`);

		return new DiscordSuggestion(foundSuggestion);
	}
}
