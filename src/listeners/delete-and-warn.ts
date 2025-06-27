import type { Listener } from "../types/listener.ts";
import { customId } from "../commands/delete-and-warn.ts";
import { MessageFlags } from "discord.js";

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
			const targetMessage =
				await interaction.channel?.messages.fetch(messageId);
			targetMessage?.delete().catch(console.error);
			if (target.moderatable) {
				const timeout = parseTime(interaction.fields.getField("timeout").value);
				if (timeout > 0) target.timeout(timeout, reason).catch(console.error);
			}
			target
				.send(
					`Your message in ${interaction.channel} was deleted for the following reason:\n\`\`\`${reason}\`\`\``,
				)
				.then(() => {
					interaction
						.reply({
							flags: MessageFlags.Ephemeral,
							content: "Reason sent.",
						})
						.catch(console.error);
				})
				.catch(() => {
					interaction
						.reply({
							flags: MessageFlags.Ephemeral,
							content: `The reason could not be sent to ${target}; they proabably blocked me or disabled DMs from server members.\n\`\`\`${reason}\`\`\``,
						})
						.catch(console.error);
				});
		},
	},
] as Listener[];

const units: Record<string, number> = {
	s: 1_000,
	m: 60_000,
	h: 3600_000,
	d: 24 * 3600_000,
};
function parseTime(time: string) {
	const parts = time.matchAll(/([0-9]+)([A-z])/g);
	let ms = 0;
	for (const [, value, unit] of parts) {
		if (+value && unit in units) {
			ms += +value * units[unit];
		}
	}
	return ms;
}
