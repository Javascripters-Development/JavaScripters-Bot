import { sqliteTable, text } from "drizzle-orm/sqlite-core";

export const Keyvaluepair = sqliteTable("keyvaluepair", {
    key: text("key").notNull().primaryKey(),
    value: text("value")
});

export interface KeyValuePairDisposition {
    key: string;
    value: string | null;
}