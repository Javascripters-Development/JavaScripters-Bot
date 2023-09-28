import db from "../../db.ts";
import { Suggestion } from "../suggestion.ts";
import { Suggestion as DbSuggestion } from "../../schemas/suggestion.ts";
import { eq, sql } from "drizzle-orm";

const FIND_BY_ID_STATEMENT = db.query.Suggestion.findMany({
	where: eq(DbSuggestion.id, sql.placeholder("id")),
	with: {
		votes: true,
	},
}).prepare();

export class SuggestionManager {
	public static async getFromId(id: number): Promise<Suggestion> {
		const foundSuggestion = (await FIND_BY_ID_STATEMENT.all({ id })).at(0);

		if (!foundSuggestion)
			throw new Error(`Could not fetch suggestion with ID ${id}`);

		return new Suggestion(foundSuggestion);
	}
}