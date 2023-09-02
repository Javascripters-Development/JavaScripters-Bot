import type { Listener } from "../types/listener.ts";
import { customId } from "../commands/delete-and-warn.ts";

export default [
	{
		event: "interactionCreate",
		async handler(interaction) {
			if (
				!interaction.isModalSubmit() ||
				!interaction.customId.endsWith(customId) ||
				!interaction.guild
			)
				return;

			const [targetId, messageId] = interaction.customId.split("_", 2);
			const target = await interaction.guild.members.fetch(targetId);
			const reason = interaction.fields.getField("deletionReason").value;
			const targetMessage = await interaction.channel?.messages.fetch(
				messageId,
			);
			targetMessage?.delete().catch(console.error);
			target
				.send(
					`Your message in ${interaction.channel} was deleted for the following reason:\n\`\`\`${reason}\`\`\``,
				)
				.then(() => {
					interaction
						.reply({
							ephemeral: true,
							content: "Reason sent.",
						})
						.catch(console.error);
				})
				.catch(() => {
					interaction
						.reply({
							ephemeral: true,
							content: `The reason could not be sent to ${target}; they proabably blocked me or disabled DMs from server members.\n\`\`\`${reason}\`\`\``,
						})
						.catch(console.error);
				});
		},
	},
] as Listener[];
