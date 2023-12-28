import type { Awaitable } from "discord.js";
import { UserError } from "../errors.ts";

export const VOTABLE_ALREADY_VOTED = "AlreadyVoted";

export class Votable<T> {
	private _votes = new Map<T, boolean>();

	constructor(upvoteIdentifiers?: T[], downvoteIdentifiers?: T[]) {
		for (const identifier of upvoteIdentifiers ?? []) {
			this._votes.set(identifier, true);
		}

		for (const identifier of downvoteIdentifiers ?? []) {
			this._votes.set(identifier, false);
		}
	}

	/**
	 * Upvotes the {@link Votable} instance.
	 *
	 * @throws {UserError} User already upvoted.
	 */
	protected async upvote(identifier: T): Promise<void> {
		if (!await this.canVote()) return

		if (this._votes.get(identifier) === true) {
			throw new UserError("Already upvoted", VOTABLE_ALREADY_VOTED);
		}

		this._votes.set(identifier, true);
	}

	/**
	 * Downvotes the {@link Votable} instance.
	 *
	 * @throws {UserError} User already downvoted.
	 */
	protected async downvote(identifier: T): Promise<void> {
		if (!await this.canVote()) return

		if (this._votes.get(identifier) === false) {
			throw new UserError("Already downvoted", VOTABLE_ALREADY_VOTED);
		}

		this._votes.set(identifier, false);
	}

	/** Check if this instance can be downvoted. */
	public canVote(): Awaitable<boolean> {
		return true
	}

	/** Removes a vote from the {@link Votable} instance. */
	protected removeVote(identifier: T): void {
		this._votes.delete(identifier);
	}

	/** Returns a boolean indicating whether the identifier has voted before. */
	protected hasVote(identifier: T): boolean {
		return this._votes.has(identifier);
	}

	/** The amount of upvotes. */
	public get upvotes(): number {
		return [...this._votes.values()].filter((isUpvote) => isUpvote === true)
			.length;
	}

	/** The amount of downvotes. */
	public get downvotes(): number {
		return [...this._votes.values()].filter((isUpvote) => isUpvote === false)
			.length;
	}
}
