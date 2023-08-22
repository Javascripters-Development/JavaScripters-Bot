import loadCommands from "djs-fsrouter";
import { Client, GatewayIntentBits, Events } from "discord.js";

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

	console.log(`Bot ${bot.user.username} ready!`);
});

client.login(process.env.TOKEN);
