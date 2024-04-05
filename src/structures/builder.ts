/** Represents a builder. */
export class Builder<Raw extends object> {
	/** The raw data */
	protected _data: Raw;

	public constructor(data?: Raw) {
		this._data = data ?? ({} as Raw);
	}

	/** The raw builder data. */
	public get data(): Raw {
		return { ...this._data };
	}
}
