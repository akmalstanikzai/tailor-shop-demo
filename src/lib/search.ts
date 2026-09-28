/**
 * Converts data from stored or synced records into safe, searchable text.
 * Older records can contain null for fields that are now typed as strings.
 */
export const searchText = (value: unknown): string => String(value ?? '').toLowerCase();

export const textIncludes = (value: unknown, query: string): boolean =>
  searchText(value).includes(searchText(query));
