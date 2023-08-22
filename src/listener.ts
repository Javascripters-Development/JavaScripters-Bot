import { Awaitable, ClientEvents } from "discord.js";

export type ListenerType = "on" | "once";

export interface ListenerOptions<
	T extends keyof ClientEvents = keyof ClientEvents,
> {
	/** @default "on" */
	type?: ListenerType;
	event: T;
	handler: (...args: ClientEvents[T]) => Awaitable<void>;
}

export type Listener<T extends keyof ClientEvents = keyof ClientEvents> =
	Required<ListenerOptions<T>>;

/**
 * Creates a single listener.\
 * Multiple listeners can be exported as an array.
 *
 * @example
 * export default createListener({
 *		event: "messageCreate",
 *		handler: async ({ channel, content }) => {
 *			if (!(channel?.isTextBased() && content === "Hello")) return;
 *
 *			channel.send("world!");
 *		},
 *	});
 */
export const createListener = <
	T extends keyof ClientEvents = keyof ClientEvents,
>(
	listener: ListenerOptions<T>,
): Listener<T> => ({
	type: "on",
	...listener,
});
