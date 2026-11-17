import { describe, expect, it, vi } from 'vitest';
import { getAllImages, getPrimaryImage, serializeImages } from '@/lib/image-utils';

vi.mock('@/lib/api-client', () => ({ apiJson: vi.fn() }));

describe('product image formats', () => {
  it('supports missing values, a single URL and legacy JSON arrays', () => {
    expect(getPrimaryImage(null)).toBe('');
    expect(getAllImages(undefined)).toEqual([]);
    expect(getPrimaryImage(' https://example.com/a.jpg ')).toBe('https://example.com/a.jpg');
    expect(getPrimaryImage('["a.jpg","b.jpg"]')).toBe('a.jpg');
    expect(getAllImages('["a.jpg",null,42,"", "b.jpg"]')).toEqual(['a.jpg', 'b.jpg']);
    expect(getPrimaryImage('[42]')).toBe('');
  });
  it('preserves malformed legacy input without crashing', () => {
    expect(getPrimaryImage('[broken')).toBe('[broken');
    expect(getAllImages('[broken')).toEqual(['[broken']);
    expect(getAllImages('[]')).toEqual([]);
  });
  it('removes blank entries and round trips saved image lists', () => {
    expect(serializeImages(['', '  '])).toBeNull();
    expect(serializeImages([' a.jpg ', ''])).toBe('a.jpg');
    expect(getAllImages(serializeImages([' a.jpg ', 'b.jpg', '']))).toEqual(['a.jpg', 'b.jpg']);
  });
});
