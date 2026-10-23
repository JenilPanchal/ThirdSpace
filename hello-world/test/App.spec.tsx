/* global globalThis, Response */
import React from 'react';
import {fireEvent, render, waitFor} from '@testing-library/react-native';
import {App} from '../src/App';
import {initialLook} from '../src/components/Avatar';
jest.mock('@amazon-devices/webview', () => ({
  WebView: require('react-native').View,
}));
// Supply a real subscription shape for the SDK's native-only back handler.
jest.mock('react-native', () => {
  const native = jest.requireActual('react-native');
  Object.defineProperty(native, 'BackHandler', {
    configurable: true,
    get: () => ({
      addEventListener: jest.fn(() => ({remove: jest.fn()})),
      exitApp: jest.fn(),
    }),
  });
  native.Dimensions.addEventListener.mockReturnValue({remove: jest.fn()});
  return native;
});

function logIn(screen: ReturnType<typeof render>) {
  fireEvent.changeText(screen.getByTestId('login-name'), 'River');
  fireEvent.changeText(screen.getByTestId('login-password'), 'demo');
  fireEvent.press(screen.getByTestId('login-submit'));
}

describe('Third Space onboarding', () => {
  it('validates login before opening the avatar editor', () => {
    const screen = render(<App />);
    fireEvent.press(screen.getByTestId('login-submit'));
    expect(
      screen.getByText('Enter a name with at least 2 characters.'),
    ).toBeTruthy();
    fireEvent.changeText(screen.getByTestId('login-name'), 'River');
    fireEvent.press(screen.getByTestId('login-submit'));
    expect(
      screen.getByText('Use at least 4 characters for the demo password.'),
    ).toBeTruthy();
    logIn(screen);
    expect(screen.getByText('Make yourself, yourself.')).toBeTruthy();
    expect(screen.queryByTestId('login-password')).toBeNull();
  });

  it('keeps hair, face and body choices across tabs and confirmation', () => {
    const screen = render(<App />);
    logIn(screen);
    fireEvent.press(screen.getByTestId('option-hair-Bob'));
    fireEvent.press(screen.getByTestId('option-hairColor-Silver'));
    fireEvent.press(screen.getByTestId('tab-Face'));
    fireEvent.press(screen.getByTestId('option-face-Square'));
    fireEvent.press(screen.getByTestId('option-expression-Grin'));
    fireEvent.press(screen.getByTestId('option-skin-Deep'));
    fireEvent.press(screen.getByTestId('tab-Body'));
    fireEvent.press(screen.getByTestId('option-body-Broad'));
    fireEvent.press(screen.getByTestId('option-shirt-Sky'));
    expect(
      screen.getByLabelText(
        'Bob hair, square face, grin expression, broad body',
      ),
    ).toBeTruthy();
    fireEvent.press(screen.getByTestId('avatar-finish'));
    expect(screen.getByTestId('avatar-summary').props.children.join('')).toBe(
      'Bob hair · Square face · Broad body',
    );
    fireEvent.press(screen.getByText('Keep customizing'));
    expect(
      screen.getByTestId('option-shirt-Sky').props.accessibilityState.selected,
    ).toBe(true);
    fireEvent.press(screen.getByTestId('tab-Hair'));
    expect(
      screen.getByTestId('option-hairColor-Silver').props.accessibilityState
        .selected,
    ).toBe(true);
  });

  it('enters the garden, seats the avatar, assigns a room and queues a search result', async () => {
    const room = {
      code: 'ABC123',
      revision: 1,
      serverTime: Date.now(),
      playing: false,
      position: 0,
      current: null,
      queue: [],
      members: [{id: 'me', name: 'River', look: initialLook, bench: 0}],
    };
    const fetchMock = jest
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (url, options) => {
        const body = options?.body ? JSON.parse(String(options.body)) : {};
        if (body.bench !== undefined) {
          room.members[0].bench = body.bench;
          room.revision++;
        }

        const path = String(url);
        const data = path.endsWith('/join')
          ? {
              token: 'private',
              memberId: 'me',
              shareUrl: 'http://192.168.1.2:8787/?room=ABC123',
              room,
            }
          : path.includes('/search?')
          ? {
              items: [
                {
                  videoId: 'M7lc1UVf-VE',
                  title: 'A garden song',
                  artist: 'Artist',
                  thumbnail: '',
                },
              ],
            }
          : room;
        return {
          ok: true,
          json: async () => JSON.parse(JSON.stringify(data)),
        } as Response;
      });
    const screen = render(<App />);
    logIn(screen);
    fireEvent.press(screen.getByTestId('avatar-finish'));
    fireEvent.press(screen.getByTestId('enter-garden'));
    expect(screen.getByText('Welcome to the garden, River.')).toBeTruthy();
    fireEvent.press(screen.getByTestId('garden-bench-1'));
    await waitFor(() =>
      expect(screen.getByText('ROOM ABC123 · SHARE THE CANVAS')).toBeTruthy(),
    );
    expect(screen.getByText('Potrait')).toBeTruthy();
    fireEvent.press(screen.getByTestId('potrait-back'));
    expect(
      screen.getByTestId('garden-bench-1').props.accessibilityState.selected,
    ).toBe(true);
    fireEvent.press(screen.getByTestId('garden-bench-2'));
    await waitFor(() =>
      expect(screen.getByTestId('bee-rectification')).toBeTruthy(),
    );
    expect(screen.getByTestId('bee-mindmap')).toBeTruthy();
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/ABC123/action'),
        expect.objectContaining({
          body: JSON.stringify({type: 'seat', bench: 2}),
        }),
      ),
    );
    fireEvent.press(screen.getByTestId('bee-back'));
    await waitFor(() =>
      expect(
        screen.getByTestId('garden-bench-2').props.accessibilityState.selected,
      ).toBe(true),
    );
    fireEvent.press(screen.getByTestId('garden-bench-0'));
    await waitFor(() => expect(screen.getByText('The Jukebox')).toBeTruthy());
    await waitFor(() =>
      expect(screen.getByText('ROOM ABC123 · SHARE WITH FRIENDS')).toBeTruthy(),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/AUTO/join'),
      expect.anything(),
    );
    fireEvent.changeText(
      screen.getByTestId('song-url'),
      'https://youtu.be/M7lc1UVf-VE',
    );
    fireEvent.press(screen.getByTestId('song-enqueue'));
    await waitFor(() =>
      expect(screen.getByText('Added to the jukebox.')).toBeTruthy(),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/ABC123/action'),
      expect.objectContaining({
        body: JSON.stringify({type: 'enqueue', url: 'M7lc1UVf-VE', title: ''}),
      }),
    );
    fireEvent.press(screen.getByText('Search'));
    fireEvent.changeText(screen.getByTestId('music-query'), 'jazz');
    fireEvent.press(screen.getByTestId('music-search'));
    await waitFor(() => expect(screen.getByText('A garden song')).toBeTruthy());
    fireEvent.press(screen.getByTestId('music-add-M7lc1UVf-VE'));
    await waitFor(() =>
      expect(screen.getByText('Added A garden song')).toBeTruthy(),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/ABC123/action'),
      expect.objectContaining({
        body: JSON.stringify({
          type: 'enqueue',
          url: 'M7lc1UVf-VE',
          title: 'A garden song',
        }),
      }),
    );
    fireEvent.press(screen.getByTestId('jukebox-back'));
    expect(
      screen.getByTestId('garden-bench-0').props.accessibilityState.selected,
    ).toBe(true);
    screen.unmount();
    fetchMock.mockRestore();
  });

  it('clears the local profile when logging out', () => {
    const screen = render(<App />);
    logIn(screen);
    fireEvent.press(screen.getByTestId('option-hair-Bald'));
    fireEvent.press(screen.getByTestId('logout'));
    expect(screen.getByTestId('login-name').props.value).toBe('');
    logIn(screen);
    expect(
      screen.getByTestId('option-hair-Waves').props.accessibilityState.selected,
    ).toBe(true);
  });
});
