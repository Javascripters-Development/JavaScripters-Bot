import {
	PermissionFlagsBits,
	ApplicationCommandType,
	TextInputStyle,
} from "discord.js";
const { ManageMessages, ModerateMembers } = PermissionFlagsBits;
import { modalInput } from "../components.ts";
import type { MessageCommand } from "djs-fsrouter";

export const customId = "delAndWarn";

const DeleteAndWarn: MessageCommand = {
	type: ApplicationCommandType.Message,
	defaultMemberPermissions: ManageMessages | ModerateMembers,
	dmPermission: false,
	run: async (interaction) => {
		const { channel, targetMessage } = interaction;
		if (!channel)
			return interaction.reply({
				ephemeral: true,
				content: "Error: could not fetch the channel",
			});
		if (channel.isDMBased())
			return interaction.reply({
				ephemeral: true,
				content: "Cannot use this command in DMs",
			});

		if (!targetMessage.deletable) {
			return interaction.reply({
				ephemeral: true,
				content:
					"I do not have the permission to delete messages in this channel.",
			});
		}
		const { id, author } = targetMessage;
		// targetMessage.member is always null for some reason
		const member = await channel.guild.members.fetch(author);

		interaction.showModal({
			title: `Deleting ${author.displayName}'s message`,
			customId: `${author.id}_${id}_${customId}`,
			components: [
				modalInput({
					customId: "deletionReason",
					label: "Reason",
					placeholder: "This will be sent in DM to the author.",
					maxLength: 512,
					style: TextInputStyle.Short,
				}),
				modalInput({
					customId: "timeout",
					required: false,
					label: "Timeout",
					placeholder: member.moderatable
						? "e.g 30m, 3h, 1d"
						: "This will have no effet; I do not have the permission to time this member out",
					style: TextInputStyle.Short,
				}),
			],
		});
	},
};
export default DeleteAndWarn;
