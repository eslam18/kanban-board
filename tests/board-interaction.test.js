// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, fireEvent, within } from '@testing-library/react';
import Board from '../src/client/components/Board.jsx';

function createBoardFixture() {
  return {
    columns: [
      { id: 1, name: 'Backlog', cards: [] },
      { id: 2, name: 'In Progress', cards: [] },
      { id: 3, name: 'Done', cards: [] },
    ],
  };
}

describe('board interactions', () => {
  afterEach(() => {
    cleanup();
  });

  it('scrolls to selected column and marks the selected tab as active', () => {
    const originalScrollIntoView = Element.prototype.scrollIntoView;
    const scrollIntoViewSpy = vi.fn();

    Object.defineProperty(Element.prototype, 'scrollIntoView', {
      configurable: true,
      writable: true,
      value: scrollIntoViewSpy,
    });

    try {
      const { getByLabelText } = render(React.createElement(Board, { board: createBoardFixture() }));
      const switcherNav = getByLabelText('Column switcher');
      const inProgressTab = within(switcherNav).getByRole('button', { name: 'In Progress' });

      fireEvent.click(inProgressTab);

      expect(scrollIntoViewSpy).toHaveBeenCalled();
      expect(scrollIntoViewSpy).toHaveBeenCalledWith({
        inline: 'start',
        block: 'nearest',
        behavior: 'smooth',
      });

      const activeClassName = inProgressTab.getAttribute('class') || '';
      expect(activeClassName).toContain('border-gray-500');
      expect(activeClassName).toContain('bg-gray-700');
      expect(activeClassName).toContain('text-gray-100');
    } finally {
      if (typeof originalScrollIntoView === 'function') {
        Object.defineProperty(Element.prototype, 'scrollIntoView', {
          configurable: true,
          writable: true,
          value: originalScrollIntoView,
        });
      } else {
        delete Element.prototype.scrollIntoView;
      }
    }
  });

  it('uses auto scrolling when reduced motion is preferred', () => {
    const originalScrollIntoView = Element.prototype.scrollIntoView;
    const originalMatchMedia = window.matchMedia;
    const scrollIntoViewSpy = vi.fn();

    Object.defineProperty(Element.prototype, 'scrollIntoView', {
      configurable: true,
      writable: true,
      value: scrollIntoViewSpy,
    });

    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: vi.fn((query) => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        addEventListener() {},
        removeEventListener() {},
      })),
    });

    try {
      const { getByLabelText } = render(React.createElement(Board, { board: createBoardFixture() }));
      const switcherNav = getByLabelText('Column switcher');
      const inProgressTab = within(switcherNav).getByRole('button', { name: 'In Progress' });

      fireEvent.click(inProgressTab);

      expect(scrollIntoViewSpy).toHaveBeenCalledWith({
        inline: 'start',
        block: 'nearest',
        behavior: 'auto',
      });
    } finally {
      if (typeof originalMatchMedia === 'function') {
        Object.defineProperty(window, 'matchMedia', {
          configurable: true,
          writable: true,
          value: originalMatchMedia,
        });
      } else {
        delete window.matchMedia;
      }

      if (typeof originalScrollIntoView === 'function') {
        Object.defineProperty(Element.prototype, 'scrollIntoView', {
          configurable: true,
          writable: true,
          value: originalScrollIntoView,
        });
      } else {
        delete Element.prototype.scrollIntoView;
      }
    }
  });
});
