// @vitest-environment jsdom
import React, { useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, fireEvent } from '@testing-library/react';
import MobileHeader from '../src/client/components/MobileHeader.jsx';
import AppShell from '../src/client/components/AppShell.jsx';

function DrawerHarness() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return React.createElement(
    AppShell,
    {
      sidebar: React.createElement('aside', null, 'Project list'),
      header: React.createElement(MobileHeader, {
        project: { name: 'Alpha Project', status: 'active' },
        boardId: 1,
        isSidebarOpen,
        isActivityOpen: false,
        onToggleSidebar: () => setIsSidebarOpen((current) => !current),
        onToggleActivity: () => {},
      }),
      isSidebarOpen,
      onSidebarClose: () => setIsSidebarOpen(false),
    },
    React.createElement('div', null, 'Board content'),
  );
}

describe('app shell drawer interactions', () => {
  afterEach(() => {
    cleanup();
  });

  it('opens and closes via Escape and backdrop dismiss control', () => {
    const { getByLabelText, getByTestId } = render(React.createElement(DrawerHarness));

    const openDrawerButton = getByLabelText('Open project drawer');
    expect(openDrawerButton.getAttribute('aria-label')).toBe('Open project drawer');

    fireEvent.click(openDrawerButton);
    expect(getByTestId('app-shell-drawer').getAttribute('class')).toContain('translate-x-0 pointer-events-auto');

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(getByLabelText('Open project drawer')).toBeTruthy();

    fireEvent.click(getByLabelText('Open project drawer'));
    fireEvent.click(getByTestId('app-shell-backdrop'));

    expect(getByLabelText('Open project drawer')).toBeTruthy();
  });

  it('closes when the in-drawer close control is clicked', () => {
    const { getByLabelText, getByTestId } = render(React.createElement(DrawerHarness));

    fireEvent.click(getByLabelText('Open project drawer'));
    fireEvent.click(getByTestId('app-shell-drawer-close'));

    expect(getByLabelText('Open project drawer').getAttribute('aria-label')).toBe('Open project drawer');
  });

  it('applies and restores scroll-lock styles when open state toggles without unmounting', () => {
    document.body.style.overflow = 'auto';
    document.body.style.touchAction = 'manipulation';
    document.documentElement.style.overflow = 'clip';

    const sharedProps = {
      sidebar: React.createElement('aside', null, 'Project list'),
      header: null,
      onSidebarClose: () => {},
    };
    const children = React.createElement('div', null, 'Board content');

    const { rerender } = render(
      React.createElement(AppShell, { ...sharedProps, isSidebarOpen: true }, children),
    );

    expect(document.body.style.overflow).toBe('hidden');
    expect(document.body.style.touchAction).toBe('none');
    expect(document.documentElement.style.overflow).toBe('hidden');

    rerender(React.createElement(AppShell, { ...sharedProps, isSidebarOpen: false }, children));

    expect(document.body.style.overflow).toBe('auto');
    expect(document.body.style.touchAction).toBe('manipulation');
    expect(document.documentElement.style.overflow).toBe('clip');
  });
});
