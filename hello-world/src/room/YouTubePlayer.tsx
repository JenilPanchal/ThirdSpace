import React, {useMemo, useRef} from 'react';
import {StyleSheet, View} from 'react-native';
import {WebView} from '@amazon-devices/webview';
import {Session} from './useSharedRoom';

export function YouTubePlayer({
  session,
  onError,
}: {
  session: Session;
  onError: (message: string) => void;
}) {
  const ref = useRef<React.ElementRef<typeof WebView>>(null);
  const source = useMemo(
    () => ({uri: `${session.server}/player?room=${session.code}`}),
    [session.server, session.code],
  );
  const connect = () =>
    ref.current?.injectJavaScript(
      `window.thirdSpaceConnect && window.thirdSpaceConnect(${JSON.stringify({
        code: session.code,
        token: session.token,
      })});true;`,
    );
  return (
    <View style={s.frame}>
      <WebView
        ref={ref}
        source={source}
        style={s.web}
        javaScriptEnabled
        domStorageEnabled
        mediaPlaybackRequiresUserAction={false}
        allowSystemKeyEvents={false}
        onLoad={connect}
        onError={() =>
          onError(
            'The YouTube player could not load. Check the room server and internet connection.',
          )
        }
        onMessage={(event) => {
          try {
            const message = JSON.parse(event.nativeEvent.data);
            if (message.type === 'bridge') {
              connect();
            }
            if (message.type === 'error') {
              onError(String(message.message));
            }
            if (message.type === 'state' && message.message === '1') {
              onError('');
            }
          } catch {
            /* Ignore unrelated messages from third-party content. */
          }
        }}
      />
    </View>
  );
}
const s = StyleSheet.create({
  frame: {
    width: 490,
    height: 276,
    backgroundColor: '#172E29',
    borderRadius: 10,
    overflow: 'hidden',
  },
  web: {flex: 1, backgroundColor: '#172E29'},
});
