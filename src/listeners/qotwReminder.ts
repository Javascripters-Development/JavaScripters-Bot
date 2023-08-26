// noinspection JSUnusedGlobalSymbols

import type { Listener } from "../types/listener.ts";
import {QotwReminderManager} from "../types/qotw.js";

export default [
    {
        event: "ready",

        handler(): void {
            QotwReminderManager.reloadInterval();
        }
    }
] as Listener[]