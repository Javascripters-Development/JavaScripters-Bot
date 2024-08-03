import type { InferInsertModel, InferSelectModel, Table } from "drizzle-orm";
import { ConfigurationStore } from "./configuration-manifest.ts";
import db from "../db.ts";

interface DatabaseStoreWriteContext<T extends Table = Table> {
	/** The table to execute queries on. */
	table: T;
	/** The table columns mapped to their new values. */
	values: {
		[Key in keyof InferInsertModel<T>]: InferInsertModel<T>[Key];
	}[];
}

interface DatabaseStoreReadContext<T extends Table = Table> {
	/** The table to execute queries on. */
	table: T;
	/** The table columns to select. */
	columns: (keyof InferSelectModel<T>)[];
}

type GetSchemaColumn<
	Schema extends object,
	T extends PropertyKey,
> = T extends keyof Schema ? Schema[T] : never;
type GetSelectFields<Schema extends Table, T extends string> = {
	[Key in T as Key extends keyof Schema ? Key : never]: GetSchemaColumn<
		Schema,
		Key
	>;
};

/** Represents a database store. */
export class DatabaseStore extends ConfigurationStore<
	DatabaseStoreWriteContext,
	DatabaseStoreReadContext
> {
	async write<T extends DatabaseStoreWriteContext>(context: T): Promise<void> {
		await db.insert(context.table).values(context.values);
	}

	async read<const T extends DatabaseStoreReadContext>(context: T) {
		const selectFields = Object.fromEntries(
			context.columns.map((fieldName) => [
				fieldName,
				context.table[fieldName as keyof typeof context.table],
			]),
		) as GetSelectFields<
			typeof context.table,
			(typeof context.columns)[number]
		>;

		return db.select(selectFields).from(context.table).get();
	}
}
