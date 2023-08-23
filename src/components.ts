import { ComponentType, ButtonStyle } from "discord.js";
const { ActionRow, StringSelect, Button } = ComponentType;

import type {
	APIActionRowComponent,
	APIStringSelectComponent,
	APISelectMenuOption,
	APIButtonComponent,
	APIButtonComponentWithCustomId,
} from "discord.js";

interface ButtonComponent
	extends Omit<Omit<APIButtonComponentWithCustomId, "type">, "style"> {
	style?:
		| ButtonStyle.Primary
		| ButtonStyle.Secondary
		| ButtonStyle.Success
		| ButtonStyle.Danger;
}

export function stringSelectMenu(
	custom_id: string,
	options: APISelectMenuOption[],
	min_values = 1,
	max_values = 1,
): APIActionRowComponent<APIStringSelectComponent> {
	return {
		type: ActionRow,
		components: [
			{ type: StringSelect, custom_id, options, min_values, max_values },
		],
	};
}

export function buttonRow(
	...buttons: ButtonComponent[]
): APIActionRowComponent<APIButtonComponent> {
	return {
		type: ActionRow,
		components: buttons.map((button) => ({
			type: Button,
			style: ButtonStyle.Primary,
			...button,
		})),
	};
}
