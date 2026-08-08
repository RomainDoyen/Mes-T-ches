import { describe, expect, it } from 'vitest';
import { parseEnvFile } from '../../scripts/load-env';

describe('parseEnvFile', () => {
  it('parses KEY=VALUE and ignores comments', () => {
    expect(
      parseEnvFile(`
# comment
APPWRITE_ENDPOINT=https://fra.cloud.appwrite.io/v1
APPWRITE_PROJECT_ID="abc123"
EMPTY=
`),
    ).toEqual({
      APPWRITE_ENDPOINT: 'https://fra.cloud.appwrite.io/v1',
      APPWRITE_PROJECT_ID: 'abc123',
      EMPTY: '',
    });
  });
});
