// If an error is thrown as an APIError, the error message should be safe to display to the end user
export default class WrappedError extends Error {
	public rootError?: Error;
	public constructor(message: string, rootError?: Error) {
		super(message);
		this.name = 'WrappedError';
		if (rootError) {
			this.rootError = rootError;
			this.stack = `Error description: ${message}\n${rootError.stack}`;
		}
	}
}
