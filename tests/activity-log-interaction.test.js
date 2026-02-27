// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import ActivityLog from '../src/client/components/ActivityLog.jsx';

let originalFetch;

beforeEach(() => {
  originalFetch = globalThis.fetch;
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => [],
  });
});

afterEach(() => {
  cleanup();
  if (typeof originalFetch === 'undefined') {
    delete globalThis.fetch;
  } else {
    globalThis.fetch = originalFetch;
  }
});

describe('activity log interactions', () => {
  it('calls onClose when Escape is pressed while open', () => {
    const onClose = vi.fn();
    render(React.createElement(ActivityLog, { boardId: 1, isOpen: true, onClose }));

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when backdrop is clicked while open', () => {
    const onClose = vi.fn();
    const { getByTestId } = render(React.createElement(ActivityLog, { boardId: 1, isOpen: true, onClose }));

    fireEvent.click(getByTestId('activity-log-backdrop'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('applies and restores scroll-lock styles when isOpen toggles', () => {
    document.body.style.overflow = 'auto';
    document.body.style.touchAction = 'manipulation';
    document.documentElement.style.overflow = 'clip';

    const sharedProps = {
      boardId: 1,
      onClose: () => {},
    };
    const { rerender } = render(React.createElement(ActivityLog, { ...sharedProps, isOpen: true }));

    expect(document.body.style.overflow).toBe('hidden');
    expect(document.body.style.touchAction).toBe('none');
    expect(document.documentElement.style.overflow).toBe('hidden');

    rerender(React.createElement(ActivityLog, { ...sharedProps, isOpen: false }));

    expect(document.body.style.overflow).toBe('auto');
    expect(document.body.style.touchAction).toBe('manipulation');
    expect(document.documentElement.style.overflow).toBe('clip');
  });
});
