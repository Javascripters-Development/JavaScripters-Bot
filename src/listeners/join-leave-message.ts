import { Client, Colors, EmbedBuilder, GuildMember, PartialGuildMember, userMention } from "discord.js"

const getTargetChannel = async (member: GuildMember | PartialGuildMember) => {
    const targetChannel = await member.guild.channels.fetch(process.env.GATEWAY_CHANNEL!)

    if (!targetChannel?.isTextBased()) {
        console.error('Gateway channel is not a text channel!')
        return undefined
    }

    return targetChannel
}

const handleGuildMemberJoin = async (member: GuildMember) => {
    const targetChannel = await getTargetChannel(member)

    if (!targetChannel) return
    
    await targetChannel.send({
        content: `Welcome ${userMention(member.id)}!`,
        embeds: [
            new EmbedBuilder({
                color: Colors.Green,
                title: `Welcome to ${member.guild.name}!`,
                description: 'Enjoy your stay!'
            })
        ]
    })
}

const handleGuildMemberLeave = async (member: GuildMember | PartialGuildMember) => {
    const targetChannel = await getTargetChannel(member)

    if (!targetChannel) return
    
    await targetChannel.send({
        embeds: [
            new EmbedBuilder({
                color: Colors.Red,
                title: `Goodbye ${member.user.username}!`
            })
        ]
    })
}

const joinLeaveMessageListener = (client: Client) => {
    client.on('guildMemberAdd', handleGuildMemberJoin)
    client.on('guildMemberRemove', handleGuildMemberLeave)
}

export { joinLeaveMessageListener }