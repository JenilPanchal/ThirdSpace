/* global globalThis, Response */
import React from 'react';
import {fireEvent, render, waitFor} from '@testing-library/react-native';
import {BeeBench} from '../src/bee/BeeBench';
import {initialLook} from '../src/components/Avatar';
import {BeeConversation} from '../src/bee/types';
jest.mock('react-native', () => {
  const native = jest.requireActual('react-native');
  Object.defineProperty(native, 'BackHandler', {
    configurable: true,
    get: () => ({addEventListener: jest.fn(() => ({remove: jest.fn()}))}),
  });
  return native;
});

test('Bee offers both paths, reviews and splits a turn, then opens mind-map source evidence', async () => {
  const conversation: BeeConversation = {
    id: 'sample-class',
    title: 'Sample class',
    summary: 'Plant biology',
    startedAt: null,
    fingerprint: 'source-fingerprint',
    utterances: [
      {id: 's1', text: 'I will draw the diagram.', speaker: 'Me'},
      {id: 's2', text: 'We need labels.', speaker: 'Me'},
    ],
    turns: [],
    review: {revision: 0, corrections: {}},
  };
  const fetchMock = jest
    .spyOn(globalThis, 'fetch')
    .mockImplementation(async (url, options) => {
      const path = String(url),
        body = options?.body ? JSON.parse(String(options.body)) : {};
      let data: unknown = {};
      if (path.endsWith('/connect')) data = {token: 'private-bee', demo: true};
      else if (path.endsWith('/conversations'))
        data = {
          items: [
            {id: conversation.id, title: conversation.title, startedAt: null},
          ],
          cursor: null,
        };
      else if (path.endsWith('/mindmap'))
        data = {
          title: 'Sample class',
          engine: 'transcript',
          reviewRevision: 1,
          branches: [
            {
              label: 'Actions',
              items: [{text: 'Draw the diagram', sourceIds: ['s1']}],
            },
          ],
          turns: [{id: 's1', text: 'draw the diagram.', speaker: 'Alex'}],
        };
      else if (path.endsWith('/review')) {
        conversation.review = {
          revision: 1,
          corrections: {s1: {segments: body.correction.segments}},
        };
        data = conversation;
      } else if (path.endsWith('/sample-class')) data = conversation;
      return {
        ok: true,
        json: async () => JSON.parse(JSON.stringify(data)),
      } as Response;
    });
  const screen = render(
    <BeeBench
      name="River"
      look={initialLook}
      server="http://localhost:8787"
      onBack={() => {}}
    />,
  );
  expect(screen.getByTestId('bee-rectification')).toBeTruthy();
  expect(screen.getByTestId('bee-mindmap')).toBeTruthy();
  fireEvent.press(screen.getByTestId('bee-rectification'));
  fireEvent.press(screen.getByTestId('bee-sample'));
  await waitFor(() =>
    expect(screen.getByTestId('bee-recording-sample-class')).toBeTruthy(),
  );
  fireEvent.press(screen.getByTestId('bee-recording-sample-class'));
  await waitFor(() => expect(screen.getByTestId('bee-speaker')).toBeTruthy());
  fireEvent.changeText(screen.getByTestId('bee-speaker'), 'River');
  fireEvent.press(screen.getByTestId('bee-split'));
  fireEvent.changeText(screen.getByTestId('bee-split-at'), '2');
  fireEvent.changeText(screen.getByTestId('bee-second-speaker'), 'Alex');
  fireEvent.press(screen.getByTestId('bee-save'));
  await waitFor(() =>
    expect(screen.getByText('Let’s check turn 2 of 2.')).toBeTruthy(),
  );
  expect(fetchMock).toHaveBeenCalledWith(
    expect.stringContaining('/sample-class/review'),
    expect.objectContaining({
      body: JSON.stringify({
        revision: 0,
        fingerprint: 'source-fingerprint',
        correction: {
          utteranceId: 's1',
          segments: [
            {text: 'I will', speaker: 'River'},
            {text: 'draw the diagram.', speaker: 'Alex'},
          ],
        },
      }),
    }),
  );
  fireEvent.press(screen.getByTestId('bee-back'));
  fireEvent.press(screen.getByTestId('bee-back'));
  fireEvent.press(screen.getByTestId('bee-mindmap'));
  await waitFor(() =>
    expect(screen.getByTestId('bee-recording-sample-class')).toBeTruthy(),
  );
  fireEvent.press(screen.getByTestId('bee-recording-sample-class'));
  await waitFor(() =>
    expect(screen.getByTestId('bee-map-node-0-0')).toBeTruthy(),
  );
  fireEvent.press(screen.getByTestId('bee-map-node-0-0'));
  expect(screen.getByText('Alex')).toBeTruthy();
  expect(screen.getByText('draw the diagram.')).toBeTruthy();
  fireEvent.press(screen.getByTestId('bee-lock'));
  expect(screen.getByTestId('bee-rectification')).toBeTruthy();
  expect(fetchMock).toHaveBeenCalledWith(
    expect.stringContaining('/api/bee/lock'),
    expect.objectContaining({
      headers: expect.objectContaining({Authorization: 'Bearer private-bee'}),
    }),
  );
  screen.unmount();
  fetchMock.mockRestore();
});
