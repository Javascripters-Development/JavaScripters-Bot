import type { Awaitable, ClientEvents } from "discord.js";

export type ListenerType = "on" | "once";

/** @private */
type MappedListeners = {
	[Event in keyof ClientEvents]: {
		/** @default "on" */
		type?: ListenerType;
		event: Event;
		handler: (...args: ClientEvents[Event]) => Awaitable<void>;
	};
};

export type Listener = MappedListeners[keyof MappedListeners];
