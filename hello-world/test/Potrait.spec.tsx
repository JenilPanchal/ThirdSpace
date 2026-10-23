import React from 'react';
import {fireEvent, render, waitFor} from '@testing-library/react-native';
import {Potrait} from '../src/room/Potrait';
import {Room} from '../src/room/useSharedRoom';
import {roomStatus} from '../src/room/status';

const session = {
  server: 'http://localhost:8787',
  code: 'PAINT',
  token: 'private',
  memberId: 'me',
  shareUrl: 'http://localhost:8787/?room=PAINT',
};
function makeRoom(remaining = 2): Room {
  return {
    code: 'PAINT',
    revision: 1,
    serverTime: Date.now(),
    playing: false,
    position: 0,
    current: null,
    queue: [],
    members: [],
    canvas: {
      width: 32,
      height: 24,
      pixels: Array(768).fill('#FFF9EB'),
      palette: ['#D88761', '#60936B'],
      budget: {remaining, resetAt: remaining === 2 ? 0 : Date.now() + 60000},
      cooldownMs: 60000,
    },
  };
}

test('Potrait paints the chosen square with the chosen color and shares its bench link', async () => {
  const action = jest.fn().mockResolvedValue(true);
  const screen = render(
    <Potrait
      room={makeRoom()}
      session={session}
      busy={false}
      error=""
      onAction={action}
      onBack={() => {}}
      onSettings={() => {}}
      onRetry={() => {}}
    />,
  );
  expect(
    screen.getByText('http://localhost:8787/?room=PAINT&bench=1'),
  ).toBeTruthy();
  fireEvent.press(screen.getByTestId('color-60936B'));
  fireEvent.press(screen.getByTestId('pixel-5-3'));
  await waitFor(() =>
    expect(action).toHaveBeenCalledWith({
      type: 'pixel',
      x: 5,
      y: 3,
      color: '#60936B',
    }),
  );
  expect(screen.getByText('Your pixel is part of the picture.')).toBeTruthy();
});

test('Potrait shows a countdown and does not submit placements with an empty allowance', () => {
  const action = jest.fn().mockResolvedValue(true);
  const screen = render(
    <Potrait
      room={makeRoom(0)}
      session={session}
      busy={false}
      error=""
      onAction={action}
      onBack={() => {}}
      onSettings={() => {}}
      onRetry={() => {}}
    />,
  );
  expect(screen.getByTestId('pixel-budget').props.children.join('')).toBe(
    '0/2',
  );
  expect(screen.getByTestId('pixel-countdown').props.children).toMatch(
    /Refills in \d+s/,
  );
  fireEvent.press(screen.getByTestId('pixel-5-3'));
  expect(action).not.toHaveBeenCalled();
  expect(
    screen.getByText(
      'A little pause. Your next two pixels will be ready soon.',
    ),
  ).toBeTruthy();
});

test('technical search diagnostics become a helpful link suggestion', () => {
  expect(roomStatus('YOUTUBE_API_KEY is not configured')).toBe(
    'Search is taking a break. Paste a YouTube link to keep the music going.',
  );
  expect(roomStatus('Network request failed')).toBe(
    'We couldn’t connect just now. Try again in a moment.',
  );
});
