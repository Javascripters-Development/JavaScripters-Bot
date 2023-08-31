import { ApplicationCommandOptionType, PermissionFlagsBits } from "discord.js";
const { ManageMessages } = PermissionFlagsBits;
import type { Command } from "djs-fsrouter";

const Purge: Command = {
	defaultMemberPermissions: ManageMessages,
	dmPermission: false,
	description: "Bulk delete messages in the current channel",
	options: [
		{
			name: "number",
			required: true,
			type: ApplicationCommandOptionType.Number,
			minValue: 2,
			maxValue: 100,
			description: "How many messages to purge",
		},
		{
			name: "author",
			type: ApplicationCommandOptionType.User,
			description: "If set, only messages from this user will be deleted",
		},
	],

	async run(interaction) {
		const number = interaction.options.getNumber("number", true);
		const author = interaction.options.getMember("author");
		const { channel } = interaction;

		function reply(content: string) {
			return interaction.reply({ ephemeral: true, content });
		}

		if (!channel) {
			return reply("Error: could not fetch the channel");
		} else if (channel.isDMBased()) {
			return reply("Error: can't do that in DMs!");
		}
		const {
			guild: { members },
		} = channel;
		const myself = members.me || (await members.fetchMe());
		if (!channel.permissionsFor(myself).has(ManageMessages)) {
			return reply(
				"Error: I do not have the permission to delete messages in this channel.",
			);
		}

		let messages = Array.from(
			(
				await channel.messages.fetch({
					limit: number && !author ? number : 100,
					cache: false,
				})
			).values(),
		);

		if (author) {
			messages = messages.filter(({ member }) => member === author);
			if (messages.length > number) messages.length = number;
		}

		channel
			.bulkDelete(messages, true)
			.then(({ size }) => reply(`Deleted ${size} messages.`))
			.catch((error) => {
				console.error(error);
				reply(`Error: ${error.message}.\nSee the console for details.`);
			});
	},
};
export default Purge;
