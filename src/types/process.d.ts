type Process = { env: Record<string, string> };

/**
 * Dummy `process` global that supports `process.env.NODE_ENV` checks to guard
 * debug-only code.
 */
declare const process: Process;
