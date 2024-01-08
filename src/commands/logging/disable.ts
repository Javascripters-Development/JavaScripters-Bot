import { LogMode, setLogging } from "./$config.ts";

import { ApplicationCommandType } from "discord.js";
import type { Command } from "djs-fsrouter";

export const type = ApplicationCommandType.ChatInput;
const Disable: Command = {
	description: "Disable message logging",
	async run(interaction) {
		if (!interaction.guild) return;

		await setLogging(interaction.guild, LogMode.NONE);
		interaction
			.reply({ ephemeral: true, content: "Logging disabled." })
			.catch(console.error);
	},
};
export default Disable;
