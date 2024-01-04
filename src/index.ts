import loadCommands from "djs-fsrouter";
import { exit } from "node:process";
import { Events, type ClientEvents, type Awaitable } from "discord.js";
import { join } from "path";
import { readdir } from "fs/promises";
import { castArray } from "./utils.ts";
import type { Listener } from "./types/listener.ts";
import { client } from "./client.ts";
import env from "./types/env.ts";
import { safeParse } from "valibot";

const parsedEnv = safeParse(
	env,
	Object.fromEntries(
		Object.entries(process.env).filter(
			([k]) => k in env.entries,
		) /* Do not allow the program to access values not specified in the schema*/,
	),
);
if (!parsedEnv.success) {
	console.error(
		`Issues loading environment variables: \n-----------\n${parsedEnv.issues
			.map(
				(issue) =>
					`Variable: ${issue?.path?.[0].key}\nInput: ${issue.input}\nError: ${issue.message}\n-----------`,
			)
			.join("\n")}`,
	);
	exit(1);
}

// @ts-expect-error default process.env signature only includes strings
process.env = parsedEnv.output;
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
