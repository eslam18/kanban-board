import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import Board from '../src/client/components/Board.jsx';

function createBoardFixture() {
  return {
    columns: [
      { id: 1, name: 'Backlog', cards: [] },
      { id: 2, name: 'In Progress', cards: [] },
      { id: 3, name: 'Review Queue', cards: [] },
    ],
  };
}

describe('board layout', () => {
  it('renders horizontal mobile scroll snap structure', () => {
    const html = renderToStaticMarkup(React.createElement(Board, { board: createBoardFixture() }));

    expect(html).toContain('overflow-x-auto');
    expect(html).toContain('snap-x');
    expect(html).toContain('snap-mandatory');
    expect(html).toContain('snap-start');
  });

  it('renders mobile column switcher tabs', () => {
    const html = renderToStaticMarkup(React.createElement(Board, { board: createBoardFixture() }));

    expect(html).toContain('aria-label="Column switcher"');
    expect(html).toContain('lg:hidden');
    expect(html).toContain('Backlog');
    expect(html).toContain('In Progress');
    expect(html).toContain('Review Queue');
  });
});
