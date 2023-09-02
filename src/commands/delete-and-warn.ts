import {
	PermissionFlagsBits,
	ApplicationCommandType,
	ComponentType,
	TextInputStyle,
} from "discord.js";
const { ManageMessages } = PermissionFlagsBits;
const { ActionRow, TextInput } = ComponentType;
import type { MessageCommand } from "djs-fsrouter";

export const customId = "delAndWarn";

const DeleteAndWarn: MessageCommand = {
	type: ApplicationCommandType.Message,
	defaultMemberPermissions: ManageMessages,
	dmPermission: false,
	run: async (interaction) => {
		const { channel } = interaction;
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

		const {
			guild: { members },
		} = channel;
		const myself = members.me || (await members.fetchMe());
		if (!channel.permissionsFor(myself).has(ManageMessages)) {
			return interaction.reply({
				ephemeral: true,
				content:
					"I do not have the permission to delete messages in this channel.",
			});
		}
		const { id, author } = interaction.targetMessage;
		interaction.showModal({
			title: `Deleting ${author.displayName}'s message`,
			customId: `${author.id}_${id}_${customId}`,
			components: [
				{
					type: ActionRow,
					components: [
						{
							type: TextInput,
							customId: "deletionReason",
							label: "Reason",
							style: TextInputStyle.Short,
						},
					],
				},
			],
		});
	},
};
export default DeleteAndWarn;
