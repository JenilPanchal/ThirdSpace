import {BeeBench} from '../bee/BeeBench';
import {youtubeId} from '../../shared/youtube';
import {Potrait} from './Potrait';
import {roomStatus} from './status';
import React, {useEffect, useRef, useState} from 'react';
import {
  BackHandler,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {AvatarLook} from '../components/Avatar';
import {Control} from '../components/Control';
import {GardenArt, JukeboxArt} from '../components/GardenArt';
import {SeatedBench} from '../components/SeatedBench';
import {Garden} from './Garden';
import {YouTubePlayer} from './YouTubePlayer';
import {MusicResult, useSharedRoom} from './useSharedRoom';

function Field({
  label,
  value,
  onChange,
  placeholder,
  testID,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  testID?: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        testID={testID}
        accessibilityLabel={label}
        value={value}
        onChangeText={onChange}
        maxLength={120}
        autoCorrect={false}
        autoCapitalize="none"
        placeholder={placeholder}
        placeholderTextColor="#8A9788"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[s.input, focused && s.inputFocused]}
      />
    </View>
  );
}
export function RoomExperience({
  name,
  look,
  onEdit,
}: {
  name: string;
  look: AvatarLook;
  onEdit: () => void;
}) {
  const shared = useSharedRoom(name, look);
  const [mode, setMode] = useState<'garden' | 'jukebox' | 'potrait' | 'bee'>(
    'garden',
  );
  const [seat, setSeat] = useState<number | null>(null);
  const [server, setServer] = useState('http://10.0.2.2:8787');
  const [code, setCode] = useState('');
  const [settings, setSettings] = useState(false);
  const [tab, setTab] = useState<'search' | 'queue' | 'link'>('link');
  const [link, setLink] = useState('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MusicResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [playerError, setPlayerError] = useState('');
  const [inputError, setInputError] = useState('');
  const [notice, setNotice] = useState('');
  const searchVersion = useRef(0);
  useEffect(
    () => () => {
      searchVersion.current++;
    },
    [],
  );
  const me = shared.room?.members.find(
    (member) => member.id === shared.session?.memberId,
  );
  const selected = me ? me.bench : seat;
  const seated = shared.room
    ? shared.room.members.filter((member) => member.bench === 0)
    : [{id: 'local', name, look, bench: 0}];
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (mode === 'bee') {
        return false;
      }
      if (mode !== 'garden') {
        setMode('garden');
      } else {
        onEdit();
      }
      return true;
    });
    return () => sub.remove();
  }, [mode, onEdit]);
  const choose = async (index: number) => {
    if (index === 2) {
      setSeat(2);
      setMode('bee');
      if (shared.session) {
        await shared.action({type: 'seat', bench: 2});
      }
      return;
    }
    if (
      shared.session &&
      !(await shared.action({type: 'seat', bench: index}))
    ) {
      return;
    }
    setSeat(index);
    if (index === 0 || index === 1) {
      setMode(index === 0 ? 'jukebox' : 'potrait');
      setSettings(false);
      if (!shared.session) {
        await shared.join(server, 'AUTO', index);
      }
    }
  };
  const connect = async (roomCode = 'AUTO') => {
    searchVersion.current++;
    setSearching(false);
    setResults([]);
    setSearched(false);
    setInputError('');
    setNotice('');
    setPlayerError('');
    shared.leave();
    if (await shared.join(server, roomCode, mode === 'potrait' ? 1 : 0)) {
      setSettings(false);
    }
  };
  const search = async () => {
    if (query.trim().length < 2) {
      setInputError('Type a song or artist name (at least 2 characters).');
      return;
    }
    const version = ++searchVersion.current;
    setSearching(true);
    setInputError('');
    setNotice('');
    setResults([]);
    try {
      const items = await shared.search(query);
      if (version === searchVersion.current) {
        setResults(items);
        setSearched(true);
      }
    } catch (e) {
      if (version === searchVersion.current) {
        setInputError(e instanceof Error ? e.message : 'Search failed.');
      }
    } finally {
      if (version === searchVersion.current) {
        setSearching(false);
      }
    }
  };
  const enqueue = async (song: MusicResult) => {
    if (
      await shared.action({
        type: 'enqueue',
        url: song.videoId,
        title: song.title,
      })
    ) {
      setPlayerError('');
      setNotice(`Added ${song.title}`);
    }
  };
  const addLink = async () => {
    const id = youtubeId(link.trim());
    if (!id) {
      setInputError(
        'That link doesn’t look like a YouTube video. Try another one.',
      );
      return;
    }
    if (await shared.action({type: 'enqueue', url: id, title: ''})) {
      setLink('');
      setInputError('');
      setPlayerError('');
      setNotice('Added to the jukebox.');
    }
  };
  if (mode === 'bee') {
    return (
      <BeeBench
        name={name}
        look={look}
        server={server}
        onBack={() => setMode('garden')}
      />
    );
  }
  if (mode === 'potrait' && settings) {
    return (
      <View style={s.root}>
        <View style={s.heading}>
          <Text style={s.title}>Potrait · Join friends</Text>
          <Control label="Back to canvas" onPress={() => setSettings(false)} />
        </View>
        <View style={s.queuePanel}>
          <Text style={s.panelTitle}>Make something together.</Text>
          <Field
            label="Friend’s room code"
            value={code}
            onChange={setCode}
            placeholder="Room code"
            testID="room-code"
          />
          <Control
            label="Join their canvas"
            disabled={shared.busy || !code.trim()}
            onPress={() => connect(code)}
          />
          <Control
            label="Find a shared canvas"
            disabled={shared.busy}
            onPress={() => connect()}
          />
          <Field
            label="Room server"
            value={server}
            onChange={setServer}
            placeholder="http://your-computer:8787"
            testID="room-server"
          />
          <Text style={s.error}>{roomStatus(shared.error)}</Text>
        </View>
      </View>
    );
  }
  if (mode === 'potrait' && !settings) {
    return (
      <Potrait
        room={shared.room}
        session={shared.session}
        busy={shared.busy}
        error={roomStatus(shared.error)}
        onAction={shared.action}
        onBack={() => setMode('garden')}
        onSettings={() => setSettings(true)}
        onRetry={() => connect()}
      />
    );
  }
  if (mode === 'garden') {
    return (
      <Garden
        name={name}
        look={look}
        memberId={shared.session?.memberId || 'local'}
        members={shared.room?.members || []}
        selected={selected}
        onChoose={choose}
        onEdit={onEdit}
        code={shared.session?.code}
        error={roomStatus(shared.error)}
      />
    );
  }
  return (
    <View style={s.root}>
      <View style={s.heading}>
        <View>
          <Text style={s.kicker}>BENCH 01 · LISTEN TOGETHER</Text>
          <Text style={s.title}>
            {mode === 'potrait' ? 'Potrait' : 'The Jukebox'}
          </Text>
        </View>
        <View style={s.share} testID="room-share">
          <Text style={s.shareCode}>
            {shared.session
              ? `ROOM ${shared.session.code} · SHARE WITH FRIENDS`
              : shared.busy
              ? 'FINDING YOUR ROOM…'
              : 'YOUR ROOM IS WAITING'}
          </Text>
          <Text style={s.shareLink} selectable>
            {shared.session?.shareUrl || 'Take a seat. We’ll find you a room.'}
          </Text>
        </View>
        <View style={s.headingActions}>
          <Control
            label={settings ? 'Close' : 'Join friends'}
            onPress={() => setSettings(!settings)}
            testID="room-settings"
          />
          <Control
            label="Back to garden"
            preferred
            onPress={() => setMode('garden')}
            testID="jukebox-back"
          />
        </View>
      </View>
      <View style={s.columns}>
        <View style={s.listening}>
          <GardenArt path={false} />
          <View style={s.jukebox}>
            <JukeboxArt />
          </View>
          <View style={s.video}>
            {shared.session ? (
              <YouTubePlayer
                session={shared.session}
                onError={setPlayerError}
              />
            ) : (
              <View style={s.emptyPlayer}>
                <Text style={s.musicMark}>♫</Text>
                <Text style={s.emptyTitle}>
                  {shared.busy
                    ? 'Finding your people…'
                    : 'There’s a song for this moment.'}
                </Text>
                <Text style={s.emptyCopy}>
                  Your room is assigned automatically.{'\n'}Search a song, then
                  add it to the jukebox.
                </Text>
              </View>
            )}
          </View>
          <View style={s.foreground}>
            <SeatedBench people={seated} />
          </View>
          <View style={s.listeners}>
            <Text style={s.listenersKicker}>ON THE BENCH</Text>
            <Text numberOfLines={2} style={s.listenerNames}>
              {seated.map((member) => member.name).join(' · ') ||
                'A seat is waiting.'}
            </Text>
            <Text style={s.listeningNote}>
              One shared queue. Everyone gets a turn.
            </Text>
          </View>
        </View>
        <View style={s.queuePanel}>
          {settings ? (
            <>
              <Text style={s.panelTitle}>Sit with your friends.</Text>
              <Text style={s.description}>
                Enter the code at the top of their room, or find a room
                automatically.
              </Text>
              <Field
                label="Friend’s room code"
                value={code}
                onChange={setCode}
                placeholder="6-character room code"
                testID="room-code"
              />
              <Control
                label="Join their room"
                primary
                disabled={shared.busy || !code.trim()}
                onPress={() => connect(code)}
                testID="room-join"
              />
              <Control
                label="Find a random room"
                disabled={shared.busy}
                onPress={() => connect()}
              />
              <Field
                label="Room server"
                value={server}
                onChange={setServer}
                placeholder="http://your-computer:8787"
                testID="room-server"
              />
            </>
          ) : !shared.session ? (
            <>
              <Text style={s.panelTitle}>
                {shared.busy ? 'Finding a room…' : 'Take your seat.'}
              </Text>
              <Text style={s.description}>
                We’ll pick a live room for you. Your friends can join using the
                share code above.
              </Text>
              <Control
                label={shared.busy ? 'Connecting…' : 'Try connecting again'}
                disabled={shared.busy}
                onPress={() => connect()}
                testID="room-retry"
              />
              <Text style={s.description}>
                Use Join friends to enter a friend’s room or change the server
                address.
              </Text>
            </>
          ) : (
            <>
              <Text style={s.kicker}>NOW PLAYING</Text>
              <Text numberOfLines={1} style={s.nowTitle}>
                {shared.room?.current?.title || 'The first song is yours.'}
              </Text>
              <Text style={s.byline}>
                {shared.room?.current
                  ? `Added by ${shared.room.current.addedBy}`
                  : 'Search for your favorite song or artist.'}
              </Text>
              <View style={s.transport}>
                <Control
                  label={shared.room?.playing ? 'Pause' : 'Play'}
                  disabled={!shared.room?.current || shared.busy}
                  onPress={() =>
                    shared.action({
                      type: shared.room?.playing ? 'pause' : 'play',
                    })
                  }
                />
                <Control
                  label="Next song"
                  disabled={!shared.room?.current || shared.busy}
                  onPress={() => {
                    setPlayerError('');
                    shared.action({
                      type: 'next',
                      expectedId: shared.room?.current?.id,
                    });
                  }}
                  testID="queue-next"
                />
              </View>
              <View style={s.tabs}>
                <Control
                  label="YouTube link"
                  selected={tab === 'link'}
                  onPress={() => {
                    setTab('link');
                    setInputError('');
                  }}
                />
                <Control
                  label="Search"
                  selected={tab === 'search'}
                  onPress={() => setTab('search')}
                />
                <Control
                  label={`Queue · ${shared.room?.queue.length || 0}`}
                  selected={tab === 'queue'}
                  onPress={() => setTab('queue')}
                />
              </View>
              {tab === 'link' ? (
                <View style={s.linkPanel}>
                  <Field
                    label="Paste a YouTube link"
                    value={link}
                    onChange={setLink}
                    placeholder="https://youtu.be/…"
                    testID="song-url"
                  />
                  <Control
                    label={
                      shared.room?.current ? '+ Add to queue' : 'Play this link'
                    }
                    primary
                    disabled={shared.busy || !link.trim()}
                    onPress={addLink}
                    testID="song-enqueue"
                  />
                  <Text style={s.emptyQueue}>
                    A song you love. A video worth sharing. Paste its link and
                    let the bench listen.
                  </Text>
                </View>
              ) : tab === 'search' ? (
                <>
                  <View style={s.addRow}>
                    <View style={s.titleField}>
                      <Field
                        label="Song or artist"
                        value={query}
                        onChange={setQuery}
                        placeholder="What do you want to hear?"
                        testID="music-query"
                      />
                    </View>
                    <View style={s.addButton}>
                      <Control
                        label={searching ? '…' : 'Search'}
                        disabled={searching || shared.busy}
                        onPress={search}
                        testID="music-search"
                      />
                    </View>
                  </View>
                  <ScrollView
                    style={s.queueList}
                    contentContainerStyle={s.queueContent}>
                    {results.map((song) => (
                      <View key={song.videoId} style={s.queueItem}>
                        <View style={s.songText}>
                          <Text numberOfLines={2} style={s.songName}>
                            {song.title}
                          </Text>
                          <Text numberOfLines={1} style={s.songBy}>
                            {song.artist} · YouTube
                          </Text>
                        </View>
                        <Control
                          label={shared.room?.current ? '+ Queue' : 'Play'}
                          disabled={shared.busy}
                          onPress={() => enqueue(song)}
                          testID={`music-add-${song.videoId}`}
                        />
                      </View>
                    ))}
                    {!results.length && (
                      <Text style={s.emptyQueue}>
                        {searching
                          ? 'Searching YouTube…'
                          : searched
                          ? 'No music found. Try another song or artist.'
                          : 'Find a song. Share a little of your world.'}
                      </Text>
                    )}
                  </ScrollView>
                </>
              ) : (
                <ScrollView
                  style={s.queueList}
                  contentContainerStyle={s.queueContent}>
                  {!shared.room?.queue.length ? (
                    <Text style={s.emptyQueue}>
                      The queue is open. Search for the next song.
                    </Text>
                  ) : (
                    shared.room.queue.map((song, index) => (
                      <View key={song.id} style={s.queueItem}>
                        <Text style={s.queueNumber}>{index + 1}</Text>
                        <View style={s.songText}>
                          <Text numberOfLines={2} style={s.songName}>
                            {song.title}
                          </Text>
                          <Text style={s.songBy}>Added by {song.addedBy}</Text>
                        </View>
                        {song.memberId === shared.session?.memberId && (
                          <Control
                            label="×"
                            onPress={() =>
                              shared.action({type: 'remove', entryId: song.id})
                            }
                          />
                        )}
                      </View>
                    ))
                  )}
                </ScrollView>
              )}
            </>
          )}
          <Text
            style={[
              s.error,
              !!notice &&
                !shared.error &&
                !inputError &&
                !playerError &&
                s.success,
            ]}
            accessibilityLiveRegion="polite"
            numberOfLines={3}>
            {roomStatus(shared.error || inputError || playerError) ||
              notice ||
              ' '}
          </Text>
        </View>
      </View>
    </View>
  );
}
const s = StyleSheet.create({
  root: {paddingTop: 20},
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
    gap: 12,
  },
  headingActions: {flexDirection: 'row', gap: 10},
  kicker: {fontSize: 11, letterSpacing: 2, color: '#7B8A71'},
  title: {fontSize: 30, fontWeight: '500', color: '#294D43', marginTop: 4},
  share: {flex: 1, alignItems: 'center'},
  shareCode: {fontSize: 16, fontWeight: '700', color: '#294D43'},
  shareLink: {fontSize: 12, color: '#7A8976', marginTop: 6},
  columns: {flexDirection: 'row', gap: 20},
  listening: {
    width: 736,
    height: 478,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#B6CA9D',
  },
  jukebox: {position: 'absolute', left: 18, top: 30},
  video: {position: 'absolute', right: 23, top: 28, width: 490, height: 276},
  emptyPlayer: {
    width: 490,
    height: 276,
    backgroundColor: '#344A47',
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  musicMark: {fontSize: 57, color: '#ECC283'},
  emptyTitle: {fontSize: 22, color: '#FFF5DE', marginTop: 12},
  emptyCopy: {
    fontSize: 15,
    lineHeight: 23,
    color: '#CFDCC7',
    textAlign: 'center',
    marginTop: 9,
  },
  foreground: {position: 'absolute', left: 65, top: 304},
  listeners: {position: 'absolute', right: 24, bottom: 41, width: 300},
  listenersKicker: {fontSize: 10, letterSpacing: 2, color: '#536B4D'},
  listenerNames: {
    fontSize: 21,
    color: '#294D43',
    marginTop: 9,
    fontWeight: '600',
  },
  listeningNote: {fontSize: 12, color: '#536B4D', marginTop: 10},
  queuePanel: {
    width: 404,
    height: 478,
    borderRadius: 22,
    padding: 20,
    backgroundColor: '#FFFEF7',
    borderWidth: 1,
    borderColor: '#E2E1D7',
    gap: 3,
  },
  panelTitle: {fontSize: 22, color: '#294D43', fontWeight: '600'},
  description: {
    fontSize: 15,
    lineHeight: 23,
    color: '#7A8976',
    marginTop: 12,
    marginBottom: 14,
  },
  field: {marginTop: 10, marginBottom: 9},
  label: {fontSize: 12, color: '#5E745F', marginBottom: 6, fontWeight: '500'},
  input: {
    height: 45,
    borderWidth: 3,
    borderColor: '#E6E9DD',
    borderRadius: 10,
    backgroundColor: '#F6F6EF',
    color: '#294D43',
    paddingHorizontal: 11,
    paddingVertical: 5,
    fontSize: 15,
  },
  inputFocused: {borderColor: '#D78154'},
  linkPanel: {flex: 1, gap: 10},
  error: {
    fontSize: 12,
    lineHeight: 17,
    color: '#7A8976',
    marginTop: 8,
    minHeight: 34,
  },
  success: {color: '#4D7649'},
  nowTitle: {fontSize: 17, color: '#3D5946', marginTop: 5},
  byline: {fontSize: 11, color: '#8A947F', marginTop: 3},
  transport: {flexDirection: 'row', gap: 10, marginTop: 6},
  tabs: {flexDirection: 'row', gap: 8, marginTop: 9},
  addRow: {flexDirection: 'row', gap: 10, alignItems: 'center'},
  titleField: {flex: 1},
  addButton: {paddingTop: 18},
  queueList: {flex: 1, marginTop: 5},
  queueContent: {paddingBottom: 6},
  emptyQueue: {fontSize: 13, color: '#8B977F', lineHeight: 20, marginTop: 12},
  queueItem: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderColor: '#EFEEE5',
  },
  queueNumber: {fontSize: 12, color: '#98A18C'},
  songText: {flex: 1},
  songName: {fontSize: 13, color: '#395341'},
  songBy: {fontSize: 10, color: '#89947D', marginTop: 4},
});
