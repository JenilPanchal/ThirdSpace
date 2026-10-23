import React, {useEffect, useRef, useState} from 'react';
import {
  BackHandler,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {Control} from '../components/Control';
import {AvatarLook} from '../components/Avatar';
import {SeatedBench} from '../components/SeatedBench';
import {BeeConversation, BeeMap, BeeRecording} from './types';

type Screen = 'home' | 'connect' | 'recordings' | 'review' | 'map' | 'source';
function Input({
  label,
  value,
  onChange,
  testID,
  secret = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  testID?: string;
  secret?: boolean;
}) {
  const [focus, setFocus] = useState(false);
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        testID={testID}
        accessibilityLabel={label}
        secureTextEntry={secret}
        value={value}
        onChangeText={onChange}
        maxLength={80}
        autoCorrect={false}
        autoCapitalize="none"
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        style={[s.input, focus && s.focus]}
      />
    </View>
  );
}
function BeeArt() {
  return (
    <View style={s.beeArt} accessible accessibilityLabel="A little striped Bee">
      <View style={[s.wing, {left: 18}]} />
      <View style={[s.wing, {right: 18}]} />
      <View style={s.beeBody}>
        {[35, 75, 115].map((left) => (
          <View key={left} style={[s.stripe, {left}]} />
        ))}
        <View style={s.eye} />
      </View>
    </View>
  );
}
function Node({
  label,
  onPress,
  testID,
}: {
  label: string;
  onPress: () => void;
  testID?: string;
}) {
  const [focus, setFocus] = useState(false);
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      onFocus={() => setFocus(true)}
      onBlur={() => setFocus(false)}
      onPress={onPress}
      style={[s.node, focus && s.focus]}>
      <Text numberOfLines={3} style={s.nodeText}>
        {label}
      </Text>
      <Text style={s.sourceHint}>View source ↗</Text>
    </Pressable>
  );
}
export function BeeBench({
  name,
  look,
  server,
  onBack,
}: {
  name: string;
  look: AvatarLook;
  server: string;
  onBack: () => void;
}) {
  const [screen, setScreen] = useState<Screen>('home'),
    [purpose, setPurpose] = useState<'review' | 'map'>('review');
  const [code, setCode] = useState(''),
    [session, setSession] = useState<{token: string; demo: boolean} | null>(
      null,
    );
  const [recordings, setRecordings] = useState<BeeRecording[]>([]),
    [cursor, setCursor] = useState<string | null>(null);
  const [conversation, setConversation] = useState<BeeConversation | null>(
      null,
    ),
    [index, setIndex] = useState(0),
    [speaker, setSpeaker] = useState(name),
    [secondSpeaker, setSecondSpeaker] = useState('Friend'),
    [split, setSplit] = useState(false),
    [splitAt, setSplitAt] = useState('');
  const [map, setMap] = useState<BeeMap | null>(null),
    [sourceIds, setSourceIds] = useState<string[]>([]),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState('');
  const active = useRef<{token: string; demo: boolean} | null>(null),
    mounted = useRef(true),
    locked = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      const current = active.current;
      if (current)
        fetch(`${server}/api/bee/lock`, {
          method: 'POST',
          headers: {Authorization: `Bearer ${current.token}`},
        }).catch(() => {});
      active.current = null;
    };
  }, [server]);
  const back = () => {
    setNotice('');
    if (screen === 'home') {
      onBack();
    } else if (screen === 'source') {
      setScreen('map');
    } else if (screen === 'review' || screen === 'map') {
      setScreen('recordings');
    } else {
      setScreen('home');
    }
  };
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      back();
      return true;
    });
    return () => sub.remove();
  });
  const request = async (
    path: string,
    body?: unknown,
    token = active.current?.token || '',
  ) => {
    const controller = new AbortController(),
      timer = setTimeout(() => controller.abort(), 30000);
    try {
      const response = await fetch(`${server}/api/bee${path}`, {
        method: body === undefined ? 'GET' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
      });
      const data = await response.json();
      if (!response.ok)
        throw Error(data.error || 'Bee is taking a moment. Please try again.');
      return data;
    } finally {
      clearTimeout(timer);
    }
  };
  const work = async (task: () => Promise<void>) => {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    setNotice('');
    try {
      await task();
    } catch (e) {
      if (mounted.current)
        setNotice(
          e instanceof Error && !/network|fetch|abort|json/i.test(e.message)
            ? e.message
            : 'We couldn’t reach your Bee space. Try again in a moment.',
        );
    } finally {
      locked.current = false;
      if (mounted.current) setBusy(false);
    }
  };
  const load = async (more = false) => {
    const data = await request(
      '/conversations' +
        (more && cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''),
    );
    if (mounted.current) {
      setRecordings((old) =>
        more
          ? [
              ...old,
              ...data.items.filter(
                (item: BeeRecording) => !old.some((c) => c.id === item.id),
              ),
            ]
          : data.items,
      );
      setCursor(data.cursor);
      setScreen('recordings');
    }
  };
  const enter = (kind: 'review' | 'map') => {
    setPurpose(kind);
    setNotice('');
    if (active.current) {
      work(() => load());
    } else {
      setScreen('connect');
    }
  };
  const connect = (demo: boolean) =>
    work(async () => {
      const value = await request('/connect', demo ? {demo: true} : {code});
      if (!mounted.current) {
        request('/lock', {}, value.token).catch(() => {});
        return;
      }
      active.current = {token: value.token, demo: value.demo};
      setSession(active.current);
      setCode('');
      await load();
    });
  const lock = () => {
    const current = active.current;
    if (current) request('/lock', {}, current.token).catch(() => {});
    active.current = null;
    setSession(null);
    setConversation(null);
    setRecordings([]);
    setMap(null);
    setScreen('home');
    setNotice('');
  };
  const prepare = (value: BeeConversation, at: number) => {
    setConversation(value);
    setIndex(at);
    const turn = value.utterances[at];
    const segments = turn
      ? value.review.corrections[turn.id]?.segments
      : undefined;
    setSpeaker(segments?.[0]?.speaker || turn?.speaker || name);
    setSecondSpeaker(segments?.[1]?.speaker || 'Friend');
    setSplit(!!segments && segments.length > 1);
    setSplitAt(
      String(
        segments?.[0]?.text.trim().split(/\s+/).length ||
          Math.max(
            1,
            Math.floor((turn?.text.trim().split(/\s+/).length || 2) / 2),
          ),
      ),
    );
  };
  const makeMap = async (value: BeeConversation) => {
    const result = await request(`/conversations/${value.id}/mindmap`, {});
    if (mounted.current) {
      setMap(result);
      setScreen('map');
    }
  };
  const open = (id: string) =>
    work(async () => {
      const value = await request(`/conversations/${id}`);
      if (!mounted.current) return;
      prepare(value, 0);
      if (purpose === 'map') {
        await makeMap(value);
      } else {
        setScreen('review');
      }
    });
  const turn = conversation?.utterances[index],
    words = turn?.text.trim().split(/\s+/) || [],
    cut = Number(splitAt),
    validSplit = Number.isInteger(cut) && cut > 0 && cut < words.length;
  const save = () =>
    work(async () => {
      if (!conversation || !turn) return;
      if (
        !speaker.trim() ||
        speaker.trim().length > 40 ||
        (split &&
          (!validSplit ||
            !secondSpeaker.trim() ||
            secondSpeaker.trim().length > 40))
      ) {
        setNotice(
          'Choose a name for each speaker and a split point within this turn.',
        );
        return;
      }
      const segments = split
        ? [
            {text: words.slice(0, cut).join(' '), speaker: speaker.trim()},
            {text: words.slice(cut).join(' '), speaker: secondSpeaker.trim()},
          ]
        : [{text: turn.text, speaker: speaker.trim()}];
      const value = await request(`/conversations/${conversation.id}/review`, {
        revision: conversation.review.revision,
        fingerprint: conversation.fingerprint,
        correction: {utteranceId: turn.id, segments},
      });
      if (!mounted.current) return;
      prepare(value, Math.min(index + 1, value.utterances.length));
      setNotice(
        index + 1 >= value.utterances.length
          ? 'Review saved in Third Space. Your original Bee transcript is preserved.'
          : 'Saved. Let’s check the next turn.',
      );
    });
  const sources = (map?.turns || []).filter((item) =>
    sourceIds.includes(item.id),
  );
  return (
    <View style={s.root}>
      <View style={s.heading}>
        <View>
          <Text style={s.kicker}>BENCH 03 · A LITTLE CLARITY</Text>
          <Text style={s.title}>Bee</Text>
        </View>
        <View style={s.privacy}>
          <Text style={s.privateTitle}>
            {session?.demo ? 'SAMPLE EXPERIENCE' : 'YOUR PRIVATE BEE SPACE'}
          </Text>
          <Text style={s.copy}>
            {session?.demo
              ? 'Example recording · not your Bee data'
              : 'Your conversations stay outside the shared lobby.'}
          </Text>
        </View>
        {session && (
          <Control
            label="Lock Bee"
            disabled={busy}
            onPress={lock}
            testID="bee-lock"
          />
        )}
        <Control
          label={screen === 'home' ? 'Back to garden' : 'Back'}
          disabled={busy}
          onPress={back}
          testID="bee-back"
        />
      </View>
      {screen === 'home' ? (
        <View style={s.home}>
          <View style={s.welcome}>
            <BeeArt />
            <Text style={s.welcomeTitle}>Let’s make sense of your day.</Text>
            <Text style={s.homeCopy}>
              A quiet seat for the things you heard,{'\n'}the people you met,
              and the ideas worth keeping.
            </Text>
            <SeatedBench people={[{id: 'me', name, look}]} />
          </View>
          <View style={s.choices}>
            <Text style={s.kicker}>WHAT WOULD YOU LIKE TO DO?</Text>
            <View style={s.choice}>
              <Text style={s.choiceNumber}>01</Text>
              <Text style={s.cardTitle}>Bee Rectification</Text>
              <Text style={s.homeCopy}>
                “That was my friend, not me.”{'\n'}Review the day together and
                put names to voices.
              </Text>
              <Control
                label="Review my day"
                primary
                onPress={() => enter('review')}
                testID="bee-rectification"
              />
            </View>
            <View style={s.choice}>
              <Text style={s.choiceNumber}>02</Text>
              <Text style={s.cardTitle}>Mind Map</Text>
              <Text style={s.homeCopy}>
                Turn a class or meeting into connected ideas, plans and
                questions.
              </Text>
              <Control
                label="Map a conversation"
                primary
                onPress={() => enter('map')}
                testID="bee-mindmap"
              />
            </View>
          </View>
        </View>
      ) : screen === 'connect' ? (
        <View style={s.connect}>
          <BeeArt />
          <View style={s.connectCard}>
            <Text style={s.cardTitle}>
              {purpose === 'review'
                ? 'A gentle end-of-day check-in.'
                : 'Give that meeting a little shape.'}
            </Text>
            <Text style={s.homeCopy}>
              Connect your Bee account on the computer, then enter your private
              pairing code here.
            </Text>
            <Input
              label="Private pairing code"
              value={code}
              onChange={setCode}
              secret
              testID="bee-code"
            />
            <View style={s.actions}>
              <Control
                label={busy ? 'Connecting…' : 'Connect Bee'}
                primary
                disabled={busy || !code}
                onPress={() => connect(false)}
                testID="bee-connect"
              />
              <Control
                label="Explore sample"
                disabled={busy}
                onPress={() => connect(true)}
                testID="bee-sample"
              />
            </View>
          </View>
        </View>
      ) : screen === 'recordings' ? (
        <View style={s.recordings}>
          <Text style={s.cardTitle}>
            {purpose === 'review'
              ? 'Which conversation shall we revisit?'
              : 'Choose a class or meeting.'}
          </Text>
          <Text style={s.copy}>
            Recent recordings, newest first.{' '}
            {session?.demo ? 'This is a sample conversation.' : ''}
          </Text>
          <ScrollView style={s.list}>
            {recordings.map((item) => (
              <View key={item.id} style={s.recording}>
                <View style={s.recordingText}>
                  <Text numberOfLines={2} style={s.recordingTitle}>
                    {item.title}
                  </Text>
                  <Text style={s.copy}>
                    {item.startedAt
                      ? new Date(item.startedAt).toLocaleString()
                      : 'Sample recording'}
                  </Text>
                </View>
                <Control
                  label={purpose === 'review' ? 'Review' : 'Create map'}
                  disabled={busy}
                  onPress={() => open(item.id)}
                  testID={`bee-recording-${item.id}`}
                />
              </View>
            ))}
            {!recordings.length && (
              <Text style={s.homeCopy}>
                No conversations yet. Once Bee has a recording, refresh this
                list.
              </Text>
            )}
            {cursor && (
              <Control
                label="More recordings"
                disabled={busy}
                onPress={() => work(() => load(true))}
              />
            )}
          </ScrollView>
          <Control
            label="Refresh"
            disabled={busy}
            onPress={() => work(() => load())}
          />
        </View>
      ) : screen === 'review' ? (
        <View style={s.review}>
          <View style={s.transcript}>
            <Text style={s.kicker}>{conversation?.title}</Text>
            <Text style={s.cardTitle}>
              {turn
                ? `Let’s check turn ${index + 1} of ${
                    conversation?.utterances.length
                  }.`
                : 'A little clearer than before.'}
            </Text>
            <Text style={s.copy}>
              {turn
                ? 'Bee originally labeled this as ' + turn.speaker
                : 'Your review is complete. Saved corrections stay in Third Space.'}
            </Text>
            <ScrollView style={s.quote}>
              {turn ? (
                <Text style={s.quoteText}>{turn.text}</Text>
              ) : (
                <View>
                  <Text style={s.quoteText}>
                    A little reflection goes a long way. Your original Bee
                    transcript stays intact.
                  </Text>
                  <Control
                    label="Create a mind map"
                    disabled={busy}
                    onPress={() =>
                      conversation && work(() => makeMap(conversation))
                    }
                    testID="bee-reviewed-map"
                  />
                </View>
              )}
            </ScrollView>
            <View style={s.actions}>
              <Control
                label="Previous"
                disabled={busy || index === 0}
                onPress={() => conversation && prepare(conversation, index - 1)}
              />
              <Control
                label="Keep / skip"
                disabled={busy || !turn}
                onPress={() => conversation && prepare(conversation, index + 1)}
              />
            </View>
          </View>
          <ScrollView style={s.editor} contentContainerStyle={s.editorContent}>
            {turn && (
              <>
                <Text style={s.cardTitle}>Who was speaking?</Text>
                <Input
                  label="Speaker name"
                  value={speaker}
                  onChange={setSpeaker}
                  testID="bee-speaker"
                />
                <View style={s.actions}>
                  <Control label="Me" onPress={() => setSpeaker(name)} />
                  <Control
                    label="Unknown"
                    onPress={() => setSpeaker('Unknown')}
                  />
                </View>
                <Control
                  label={split ? 'Use one speaker' : 'Two people in this turn?'}
                  disabled={busy || words.length < 2}
                  onPress={() => setSplit(!split)}
                  testID="bee-split"
                />
                {split && (
                  <>
                    <Input
                      label={`Split after word (1–${words.length - 1})`}
                      value={splitAt}
                      onChange={setSplitAt}
                      testID="bee-split-at"
                    />
                    <Input
                      label="Second speaker"
                      value={secondSpeaker}
                      onChange={setSecondSpeaker}
                      testID="bee-second-speaker"
                    />
                    <Text style={s.copy}>
                      {validSplit
                        ? `${speaker}: ${words
                            .slice(0, cut)
                            .join(' ')}\n\n${secondSpeaker}: ${words
                            .slice(cut)
                            .join(' ')}`
                        : 'Choose where the first speaker stops.'}
                    </Text>
                  </>
                )}
                <Control
                  label={busy ? 'Saving…' : 'Save & continue'}
                  primary
                  disabled={busy}
                  onPress={save}
                  testID="bee-save"
                />
                <Text style={s.copy}>
                  Speaker labels can be corrected; the original words stay
                  intact.
                </Text>
              </>
            )}
          </ScrollView>
        </View>
      ) : screen === 'map' ? (
        <View style={s.mapPanel}>
          <View style={s.mapRoot}>
            <Text style={s.kicker}>MIND MAP</Text>
            <Text numberOfLines={4} style={s.rootTitle}>
              {map?.title}
            </Text>
            <Text style={s.copy}>
              {map?.engine === 'bee-agent'
                ? 'Organized by Bee'
                : 'Transcript-based draft'}
            </Text>
          </View>
          <View style={s.trunk} />
          <View style={s.rootLine} />
          {map?.branches.map((branch, i) => (
            <View
              key={branch.label + i}
              style={[s.branch, {top: 12 + i * 112}]}>
              <View style={s.branchLine} />
              <Text numberOfLines={3} style={s.branchLabel}>
                {branch.label}
              </Text>
              <ScrollView horizontal contentContainerStyle={s.nodes}>
                {branch.items.map((item, j) => (
                  <Node
                    key={j}
                    label={item.text}
                    onPress={() => {
                      setSourceIds(item.sourceIds);
                      setScreen('source');
                    }}
                    testID={`bee-map-node-${i}-${j}`}
                  />
                ))}
              </ScrollView>
            </View>
          ))}
        </View>
      ) : (
        <View style={s.sourcePanel}>
          <Text style={s.cardTitle}>The words behind the idea.</Text>
          <Text style={s.copy}>
            Speaker labels include your saved corrections. Speech recognition
            can still miss words.
          </Text>
          <ScrollView style={s.list}>
            {sources.map((item, i) => (
              <View key={item.id + ':' + i} style={s.sourceTurn}>
                <Text style={s.sourceSpeaker}>{item.speaker}</Text>
                <Text style={s.quoteText}>{item.text}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}
      <Text style={s.status} accessibilityLiveRegion="polite">
        {busy ? 'One moment…' : notice || ' '}
      </Text>
    </View>
  );
}
const s = StyleSheet.create({
  root: {paddingTop: 20},
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  kicker: {fontSize: 11, letterSpacing: 1.6, color: '#7B8A71'},
  title: {fontSize: 30, color: '#294D43', marginTop: 4},
  privacy: {flex: 1, alignItems: 'center'},
  privateTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6D8067',
    letterSpacing: 1,
  },
  copy: {fontSize: 12, lineHeight: 18, color: '#7A8976', marginTop: 5},
  home: {height: 450, flexDirection: 'row', gap: 24},
  welcome: {
    width: 500,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    backgroundColor: '#E4E9CF',
    paddingTop: 12,
  },
  welcomeTitle: {fontSize: 25, color: '#294D43', marginTop: 5},
  homeCopy: {
    fontSize: 15,
    lineHeight: 23,
    color: '#7A8976',
    marginTop: 10,
    marginBottom: 12,
  },
  choices: {flex: 1, gap: 10},
  choice: {flex: 1, padding: 16, borderRadius: 20, backgroundColor: '#FFFEF7'},
  choiceNumber: {
    position: 'absolute',
    right: 20,
    top: 15,
    color: '#C1BCA2',
    fontSize: 22,
  },
  cardTitle: {fontSize: 23, color: '#294D43', marginTop: 2},
  connect: {
    height: 450,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 70,
    backgroundColor: '#F6F3E7',
    borderRadius: 24,
  },
  connectCard: {width: 560},
  actions: {flexDirection: 'row', gap: 10, marginTop: 12},
  field: {marginTop: 14, marginBottom: 10},
  label: {fontSize: 12, color: '#6D8067', marginBottom: 5},
  input: {
    height: 46,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: '#E5E6DA',
    backgroundColor: '#F7F6EE',
    fontSize: 17,
    color: '#294D43',
    paddingHorizontal: 12,
  },
  focus: {borderColor: '#D88761', borderWidth: 3},
  recordings: {
    height: 450,
    padding: 22,
    backgroundColor: '#FFFEF7',
    borderRadius: 24,
  },
  list: {flex: 1, marginVertical: 14},
  recording: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: '#E9E8DD',
  },
  recordingText: {flex: 1},
  recordingTitle: {fontSize: 20, color: '#294D43'},
  review: {height: 450, flexDirection: 'row', gap: 20},
  transcript: {
    width: 716,
    padding: 22,
    borderRadius: 22,
    backgroundColor: '#E8ECD9',
  },
  quote: {flex: 1, marginVertical: 20},
  quoteText: {fontSize: 21, lineHeight: 32, color: '#365548'},
  editor: {width: 424, borderRadius: 22, backgroundColor: '#FFFEF7'},
  editorContent: {padding: 20, paddingBottom: 30},
  status: {fontSize: 13, lineHeight: 20, color: '#7A8976', marginTop: 10},
  mapPanel: {height: 462, borderRadius: 22, backgroundColor: '#E9ECDD'},
  mapRoot: {
    position: 'absolute',
    left: 18,
    top: 162,
    width: 198,
    minHeight: 125,
    padding: 16,
    borderRadius: 20,
    backgroundColor: '#FFF8DE',
  },
  rootTitle: {fontSize: 20, color: '#294D43', marginTop: 8},
  trunk: {
    position: 'absolute',
    left: 238,
    top: 60,
    height: 336,
    width: 2,
    backgroundColor: '#BCC9A7',
  },
  rootLine: {
    position: 'absolute',
    left: 216,
    top: 224,
    width: 24,
    height: 2,
    backgroundColor: '#BCC9A7',
  },
  branch: {
    position: 'absolute',
    left: 264,
    width: 876,
    height: 100,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 10,
    backgroundColor: '#FFFEF7',
    gap: 10,
  },
  branchLine: {
    position: 'absolute',
    left: -26,
    top: 48,
    width: 26,
    height: 2,
    backgroundColor: '#BCC9A7',
  },
  branchLabel: {width: 95, fontSize: 15, fontWeight: '600', color: '#365548'},
  nodes: {gap: 8, alignItems: 'center'},
  node: {
    width: 175,
    height: 80,
    padding: 8,
    backgroundColor: '#F0F0E5',
    borderRadius: 10,
    borderWidth: 3,
    borderColor: 'transparent',
    justifyContent: 'space-between',
  },
  nodeText: {fontSize: 11, lineHeight: 14, color: '#365548'},
  sourceHint: {fontSize: 9, color: '#87916E'},
  sourcePanel: {
    height: 450,
    padding: 24,
    backgroundColor: '#FFFEF7',
    borderRadius: 22,
  },
  sourceTurn: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: '#E4E5D9',
  },
  sourceSpeaker: {
    fontSize: 14,
    fontWeight: '700',
    color: '#A77952',
    marginBottom: 5,
  },
  beeArt: {width: 220, height: 125},
  wing: {
    position: 'absolute',
    top: 0,
    width: 80,
    height: 64,
    borderRadius: 40,
    backgroundColor: '#FFFDF0',
    borderWidth: 3,
    borderColor: '#E0DFC8',
    transform: [{rotate: '-20deg'}],
  },
  beeBody: {
    position: 'absolute',
    left: 15,
    top: 40,
    width: 190,
    height: 80,
    borderRadius: 50,
    backgroundColor: '#E4BC64',
    overflow: 'hidden',
  },
  stripe: {
    position: 'absolute',
    top: 0,
    width: 18,
    height: 80,
    backgroundColor: '#53624A',
  },
  eye: {
    position: 'absolute',
    right: 21,
    top: 27,
    width: 9,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#344A47',
  },
});
