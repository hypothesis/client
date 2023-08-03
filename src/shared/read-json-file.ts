import { promiseWithResolvers } from './promise-with-resolvers';

/**
 * Reads and tries to JSON-parse a file
 * @return - Promise that resolves to parsed content or rejects with any error
 *           that occurred during parsing
 */
export function readJSONFile(
  file: File,
  /* istanbul ignore next - test seam */
  fileReader = new FileReader(),
): Promise<unknown> {
  const { promise, resolve, reject } = promiseWithResolvers();

  fileReader.addEventListener('loadend', (e: ProgressEvent<FileReader>) => {
    try {
      const content = e.target?.result?.toString() ?? '';
      const parsed = JSON.parse(content);

      resolve(parsed);
    } catch (error) {
      reject(error);
    }
  });
  fileReader.readAsText(file);

  return promise;
}
