import { Query } from 'node-appwrite';

const PAGE_SIZE = 100;

/** Build TablesDB list queries in the JSON format Appwrite Cloud expects. */
export function buildListQueries(
  userId: string,
  since: string,
  cursor?: string,
): string[] {
  const queries = [
    Query.equal('userId', userId),
    Query.greaterThan('updatedAt', since),
    Query.limit(PAGE_SIZE),
  ];
  if (cursor) queries.push(Query.cursorAfter(cursor));
  return queries;
}

export { PAGE_SIZE };
