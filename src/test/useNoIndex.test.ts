import { renderHook } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useNoIndex } from '@/hooks/useNoIndex';

describe('useNoIndex', () => {
  let meta: HTMLMetaElement;

  beforeEach(() => {
    meta = document.createElement('meta');
    meta.setAttribute('name', 'robots');
    meta.setAttribute('content', 'index, follow');
    document.head.appendChild(meta);
  });

  afterEach(() => {
    meta.remove();
  });

  it('sets meta robots to noindex, nofollow on mount', () => {
    renderHook(() => useNoIndex());
    expect(meta.getAttribute('content')).toBe('noindex, nofollow');
  });

  it('restores the previous robots value on unmount', () => {
    const { unmount } = renderHook(() => useNoIndex());
    unmount();
    expect(meta.getAttribute('content')).toBe('index, follow');
  });

  it('does nothing when no meta robots tag exists', () => {
    meta.remove();
    expect(() => renderHook(() => useNoIndex())).not.toThrow();
    document.head.appendChild(meta);
  });
});
