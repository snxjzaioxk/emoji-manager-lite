import { toFileURL, formatFileSize } from '../../src/shared/utils';

describe('toFileURL', () => {
  test('converts Windows absolute paths to file URLs', () => {
    const url = toFileURL('C:\\path\\to\\emoji.png');
    expect(url).toBe('file:///C:/path/to/emoji.png');
  });

  test('converts Unix absolute paths to file URLs', () => {
    const url = toFileURL('/var/data/emoji.png');
    expect(url).toBe('file:///var/data/emoji.png');
  });

  test('rejects potentially unsafe paths', () => {
    const url = toFileURL('../emoji.png');
    expect(url).toBe('');
  });
});

describe('formatFileSize', () => {
  test('returns bytes for small sizes', () => {
    expect(formatFileSize(512)).toBe('512 B');
  });

  test('returns kilobytes for medium sizes', () => {
    expect(formatFileSize(2048)).toBe('2.0 KB');
  });

  test('returns megabytes for large sizes', () => {
    expect(formatFileSize(5 * 1024 * 1024)).toBe('5.0 MB');
  });
});
