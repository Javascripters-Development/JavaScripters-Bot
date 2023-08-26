import type {IntRange} from "./IntRange.js";
import {client} from "../Exports.js";
import {EmbedBuilder} from "discord.js";
import db from "../db.js";
import {Keyvaluepair, type KeyValuePairDisposition} from "../schemas/keyvaluepair.js";
import {eq} from "drizzle-orm";

export interface QotwDate {
    weekDay: IntRange<1, 7>;
    hour: IntRange<1, 24>;
    minute: IntRange<0, 59>;
}

export class QotwReminderManager {
    private static currentInterval: NodeJS.Timeout | undefined;
    private static currentTimeout: NodeJS.Timeout | undefined;

    public static uploadDate(date: QotwDate) {
        (!QotwReminderManager.getDate()
            ? db.insert(Keyvaluepair).values({key: "qotwdate", value: JSON.stringify(date)})
            : db.update(Keyvaluepair).set({value: JSON.stringify(date)}).where(eq(Keyvaluepair.key, "qotwdate")))
            .execute().then()

        QotwReminderManager.reloadInterval();
    }

    public static getDate(): QotwDate | undefined {
        const value: KeyValuePairDisposition[] = db.select().from(Keyvaluepair).where(eq(Keyvaluepair.key, "qotwdate")).all()
        return value.length === 0 ? undefined : JSON.parse(value[0].value!);
    }

    public static reloadInterval(): void {
        if (QotwReminderManager.currentInterval) {
            clearInterval(QotwReminderManager.currentInterval);
            QotwReminderManager.currentInterval = undefined;
        }

        if (QotwReminderManager.currentTimeout) {
            clearInterval(QotwReminderManager.currentTimeout);
            QotwReminderManager.currentTimeout = undefined;
        }

        const qotwRemindDate: QotwDate | undefined = QotwReminderManager.getDate();

        if (!qotwRemindDate) {
            QotwReminderManager.currentInterval = undefined;
            QotwReminderManager.currentTimeout = undefined;
            return;
        }

        async function searchAndSendReminder() {
            for (const [_, member] of (await (await client.guilds.fetch("779474636780863488")).roles.fetch("1140826891599757382"))!.members)
                await member.send({embeds: [new EmbedBuilder()
                        .setColor(0x9b59b6)
                        .setTitle("QOTW reminder")
                        .setDescription("The time for a new QOTW is here, go to <#779826597729271828> and create a new question thread.")]});
        }

        QotwReminderManager.currentTimeout = setTimeout(async () => {
            await searchAndSendReminder();
            QotwReminderManager.currentInterval = setInterval(async () => {
                await searchAndSendReminder();
            }, 604800000);
            QotwReminderManager.currentTimeout = undefined;
        }, QotwReminderManager.getRemainingMilliseconds(qotwRemindDate as QotwDate))
    }

    private static getRemainingMilliseconds(qotw: QotwDate): number {
        const now: Date = new Date(),
            currentDay: number = now.getDay() || 7,
            targetDay: number = qotw.weekDay === 7 ? 0 : qotw.weekDay,
            cd: boolean = currentDay < targetDay || (currentDay === targetDay && now.getHours() < qotw.hour) || (currentDay === targetDay && now.getHours() === qotw.hour && now.getMinutes() < qotw.minute),
            targetDate: Date = cd
            ? new Date(now.getFullYear(), now.getMonth(), now.getDate() + (targetDay - currentDay))
            : new Date(now.getFullYear(), now.getMonth(), now.getDate() + (7 - currentDay + (targetDay === 0 ? 7 : targetDay)));

        cd ? targetDate.setHours(qotw.hour, qotw.minute, 0, 0) : targetDate.setHours(qotw.hour, qotw.minute, 0, 0);

        return targetDate.getTime() - now.getTime();
    }
}
