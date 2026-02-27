import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import ActivityLog from '../src/client/components/ActivityLog.jsx';

describe('activity log layout', () => {
  it('renders responsive desktop panel and mobile bottom sheet structure', () => {
    const html = renderToStaticMarkup(
      React.createElement(ActivityLog, {
        boardId: 1,
        isOpen: true,
        onClose: () => {},
      }),
    );

    expect(html).toContain('aria-label="Close activity log"');
    expect(html).toContain('hidden lg:block');
    expect(html).toContain('w-[400px]');
    expect(html).toContain('lg:hidden');
    expect(html).toContain('rounded-t-2xl');
    expect(html).toContain('bottom-0');
    expect(html).toContain('Recent Activity');
  });
});
