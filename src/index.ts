import loadCommands from "djs-fsrouter";
import {
	Client,
	GatewayIntentBits,
	Events,
	ClientEvents,
	Awaitable,
} from "discord.js";
import { join } from "path";
import { readdir } from "fs/promises";
import { castArray } from "./utils.ts";
import { Listener } from "./types/listener.ts";

const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent,
		GatewayIntentBits.GuildMembers,
	],
});

client.once(Events.ClientReady, async (bot) => {
	try {
		await loadCommands(client, {
			folder: "src/commands",
			singleServer: true,
			ownerServer: process.env.GUILD,
			debug: !(process.env.NODE_ENV === "production"),
			commandFileExtension: ["js", "ts"],
		});
	} catch (err) {
		console.error(`Error loading commands ${err}`);
	}

	// Initialize all event listeners
	const listenerDirectory = join(process.cwd(), "src/listeners");
	const listenerFilenames = await readdir(listenerDirectory);
	for (const listenerFilename of listenerFilenames) {
		const listenerPath = join(listenerDirectory, listenerFilename);
		try {
			const { default: listeners } = (await import(listenerPath)) as {
				default: Listener[];
			};

			for (const listener of castArray(listeners)) {
				client[listener.type ?? "on"](
					listener.event as keyof ClientEvents,
					listener.handler as (...args: unknown[]) => Awaitable<void>,
				);
			}
		} catch (err) {
			console.error(`Error loading listener ${listenerPath}!\n${err}`);
		}
	}

	console.log(`Bot ${bot.user.username} ready!`);
});

client.login(process.env.TOKEN);
