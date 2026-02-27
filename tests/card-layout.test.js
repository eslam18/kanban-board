import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import Card from '../src/client/components/Card.jsx';

function createCardFixture() {
  return {
    id: 1,
    title: 'A'.repeat(300),
    description: `${'description-without-spaces-'.repeat(12)} and some normal words to ensure snippet rendering.`,
    status: 'this-is-a-super-long-status-value-without-spaces'.repeat(3),
    retries: 4,
  };
}

describe('card layout', () => {
  it('renders overflow guard classes for long content', () => {
    const html = renderToStaticMarkup(React.createElement(Card, { card: createCardFixture() }));

    expect(html).toContain('min-w-0 overflow-hidden');
    expect(html).toContain('flex min-w-0 flex-wrap');
    expect(html).toContain('min-w-0 max-w-full truncate');
    expect(html).toContain('min-w-0 break-words text-sm');
    expect(html).toContain('min-w-0 break-words text-xs');
    expect(html).toContain('title="this-is-a-super-long-status-value-without-spacesthis-is-a-super-long-status-value-without-spacesthis-is-a-super-long-status-value-without-spaces"');
    expect(html).toContain('title="Retries: 4"');
  });
});
