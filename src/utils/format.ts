/** Format text as small text. */
export const smallText = <T extends string>(text: T): `-# ${T}` => `-# ${text}`;
