// noinspection JSUnusedGlobalSymbols

import type {Command} from "djs-fsrouter";
import type {
    ChatInputCommandInteraction,
    ApplicationCommandOptionData,
    InteractionReplyOptions
} from "discord.js";
import {EmbedBuilder, GuildMemberRoleManager, Role, SlashCommandStringOption,} from "discord.js";
import {type QotwDate, QotwReminderManager} from "../types/qotw.js";
import type {IntRange} from "../types/IntRange.js";

export default {
    dmPermission: false,
    description: "lets you change the next QOTW reminder date.",
    options: [new SlashCommandStringOption().setName("time").setDescription("the time formatted as dd:hh:mm").setRequired(true)] as ApplicationCommandOptionData[],

    async run(interaction: ChatInputCommandInteraction): Promise<void> {
        function errMsg(title: string, desc: string): InteractionReplyOptions {
            return {embeds: [new EmbedBuilder().setTitle(title).setColor(0xFF0000).setDescription(desc)], ephemeral: true};
        }

        // if (!(<GuildMemberRoleManager>interaction.member!.roles).cache.find(r => r.id === "1140826891599757382" || r.id === "722933309633462274")) {
        //     await interaction.reply(errMsg("Insufficient permissions", "You require the following roles: `Owner` | `QOTW Manger`"));
        //     return;
        // }

        const timeRegex: RegExpExecArray | null = /^(\d+):(\d+):(\d+)$/gm.exec(interaction.options.getString("time")!);

        if (!timeRegex || timeRegex.length !== 4) {
            await interaction.reply(errMsg("Invalid time", "The time format should follow the `1-7:1-24:0-59` format."));
            return;
        }

        const newDate: QotwDate = {
            weekDay: parseInt(timeRegex[1]) as IntRange<1, 7>,
            hour: parseInt(timeRegex[2]) as IntRange<1, 24>,
            minute: parseInt(timeRegex[3]) as IntRange<0, 59>
        }

        QotwReminderManager.uploadDate(newDate);

        await interaction.reply({embeds: [new EmbedBuilder()
                .setTitle("Success")
                .setColor(0x00FF00)
                .setDescription(`Set the new date for reminder to:\`\`\`\nday of the week: ${newDate.weekDay}\nhour of the day: ${newDate.hour}:${newDate.minute}\`\`\``)
            ]});
    }
} as Command;