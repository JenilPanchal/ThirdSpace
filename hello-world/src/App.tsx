import {GardenArt} from './components/GardenArt';
import {SeatedBench} from './components/SeatedBench';
import React, {useEffect, useState} from 'react';
import {
  BackHandler,
  Keyboard,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import {TVFocusGuideView} from '@amazon-devices/react-native-kepler';
import {Avatar, AvatarLook, initialLook} from './components/Avatar';
import {Control} from './components/Control';
import {RoomExperience} from './room/RoomExperience';

type Category = 'Hair' | 'Face' | 'Body';
const hairColors = [
  {label: 'Espresso', value: '#3D2925'},
  {label: 'Chestnut', value: '#875538'},
  {label: 'Honey', value: '#D5AB62'},
  {label: 'Silver', value: '#C8C7C2'},
];
const skinColors = [
  {label: 'Porcelain', value: '#F2CFB3'},
  {label: 'Sand', value: '#DDA478'},
  {label: 'Amber', value: '#BE8056'},
  {label: 'Umber', value: '#8C583D'},
  {label: 'Deep', value: '#563A30'},
];
const shirtColors = [
  {label: 'Clay', value: '#D88761'},
  {label: 'Sage', value: '#8AA890'},
  {label: 'Sky', value: '#7E9BB9'},
  {label: 'Butter', value: '#DBBD6F'},
  {label: 'Plum', value: '#977A9E'},
];

function Bench({mini = false}: {mini?: boolean}) {
  return (
    <View style={mini ? s.miniBench : s.bench} accessible={false}>
      {[0, 1, 2].map((i) => (
        <View
          key={i}
          style={[
            s.slat,
            {
              top: i * (mini ? 5 : 15),
              height: mini ? 3 : 10,
              backgroundColor: mini ? '#294D43' : '#C89966',
            },
          ]}
        />
      ))}
      <View style={[s.seat, mini && s.miniSeat]} />
      <View style={[s.benchLeg, mini && s.miniLeg, {left: '15%'}]} />
      <View style={[s.benchLeg, mini && s.miniLeg, {right: '15%'}]} />
    </View>
  );
}

function Login({onLogin}: {onLogin: (name: string) => void}) {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [focused, setFocused] = useState('');
  const login = () => {
    if (name.trim().length < 2) {
      setError('Enter a name with at least 2 characters.');
      return;
    }
    if (password.length < 4) {
      setError('Use at least 4 characters for the demo password.');
      return;
    }
    Keyboard.dismiss();
    setPassword('');
    onLogin(name.trim());
  };
  return (
    <View style={s.loginLayout}>
      <View style={s.hero}>
        <Text style={s.eyebrow}>YOUR LITTLE CORNER OF THE INTERNET</Text>
        <Text style={s.heroTitle}>There’s a seat for you.</Text>
        <View
          style={[
            s.benchScene,
            {
              overflow: 'hidden',
              borderRadius: 28,
              alignItems: 'center',
              justifyContent: 'center',
            },
          ]}>
          <GardenArt path={false} />
          <SeatedBench people={[]} />
        </View>
      </View>
      <TVFocusGuideView autoFocus style={s.loginCard}>
        <View style={s.loginFields}>
          <View style={s.loginField}>
            <Text style={s.fieldLabel}>Display name</Text>
            <TextInput
              testID="login-name"
              accessibilityLabel="Display name"
              value={name}
              onChangeText={setName}
              maxLength={24}
              autoCapitalize="words"
              autoCorrect={false}
              placeholder="What should we call you?"
              placeholderTextColor="#8A9188"
              onFocus={() => setFocused('name')}
              onBlur={() => setFocused('')}
              style={[s.input, focused === 'name' && s.inputFocused]}
            />
          </View>
          <View style={s.loginField}>
            <Text style={s.fieldLabel}>Password</Text>
            <TextInput
              testID="login-password"
              accessibilityLabel="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              maxLength={64}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="Your demo password"
              placeholderTextColor="#8A9188"
              onSubmitEditing={login}
              onFocus={() => setFocused('password')}
              onBlur={() => setFocused('')}
              style={[s.input, focused === 'password' && s.inputFocused]}
            />
          </View>
        </View>
        <Text style={s.error} accessibilityLiveRegion="polite">
          {error || ' '}
        </Text>
        <View style={s.loginButton}>
          <Control
            label="Log in"
            primary
            onPress={login}
            testID="login-submit"
          />
        </View>
        <Text style={s.demoNote}>LOCAL PREVIEW · NO ACCOUNT NEEDED</Text>
        <Text style={s.demoCopy}>
          Any name · Password of 4+ characters · No account created or password
          stored
        </Text>
      </TVFocusGuideView>
    </View>
  );
}

export function App() {
  const {width, height} = useWindowDimensions();
  const scale = Math.min(width / 1280, height / 720);
  const [name, setName] = useState<string | null>(null);
  const [category, setCategory] = useState<Category>('Hair');
  const [look, setLook] = useState<AvatarLook>(initialLook);
  const [ready, setReady] = useState(false);
  const [inGarden, setInGarden] = useState(false);
  const update = <K extends keyof AvatarLook>(key: K, value: AvatarLook[K]) => {
    setLook((old) => ({...old, [key]: value}));
    setReady(false);
  };
  const logout = () => {
    setInGarden(false);
    setName(null);
    setReady(false);
    setCategory('Hair');
    setLook(initialLook);
  };
  useEffect(() => {
    if (inGarden) {
      return;
    }
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (ready) {
        setReady(false);
        return true;
      }
      if (name !== null) {
        setName(null);
        setCategory('Hair');
        setLook(initialLook);
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [name, ready, inGarden]);

  function choices<K extends keyof AvatarLook>(
    key: K,
    values: AvatarLook[K][],
  ) {
    return (
      <View style={s.options}>
        {values.map((value) => (
          <Control
            key={value}
            label={value}
            selected={look[key] === value}
            onPress={() => update(key, value)}
            testID={`option-${key}-${value}`}
          />
        ))}
      </View>
    );
  }
  function colors(
    key: 'hairColor' | 'skin' | 'shirt',
    values: {label: string; value: string}[],
  ) {
    return (
      <View style={s.options}>
        {values.map((item) => (
          <Control
            key={item.value}
            label={item.label}
            color={item.value}
            selected={look[key] === item.value}
            onPress={() => update(key, item.value)}
            testID={`option-${key}-${item.label}`}
          />
        ))}
      </View>
    );
  }

  return (
    <View style={s.root}>
      <View
        style={[
          s.stage,
          {
            left: (width - 1280) / 2,
            top: (height - 720) / 2,
            transform: [{scale}],
          },
        ]}>
        <View style={s.header}>
          <View style={s.brand}>
            <Bench mini />
            <Text style={s.wordmark}>
              third space<Text style={s.brandDot}>.</Text>
            </Text>
          </View>
          <Text style={s.headerNote}>
            {name === null
              ? 'Away from the noise. Closer to each other.'
              : inGarden
              ? 'THE GARDEN · A LITTLE HUMAN CONNECTION'
              : '01  LOG IN  ✓      /      02  MAKE YOURSELF AT HOME'}
          </Text>
        </View>
        {name === null ? (
          <Login onLogin={setName} />
        ) : inGarden ? (
          <RoomExperience
            name={name}
            look={look}
            onEdit={() => setInGarden(false)}
          />
        ) : (
          <View style={s.editor}>
            <View style={s.editorHeading}>
              <View>
                <Text style={s.eyebrow}>A FAMILIAR FACE, EVEN FROM AFAR</Text>
                <Text style={s.editorTitle}>
                  {ready
                    ? `Looking good, ${name}.`
                    : 'Make yourself, yourself.'}
                </Text>
              </View>
              <Control label="Log out" onPress={logout} testID="logout" />
            </View>
            <View style={s.editorColumns}>
              <View style={s.preview}>
                <Text style={s.previewKicker}>THIS IS YOU</Text>
                <View style={s.avatarHalo} />
                <View style={s.avatarPosition}>
                  <Avatar look={look} />
                </View>
                <View style={s.namePill}>
                  <View style={s.onlineDot} />
                  <Text style={s.previewName}>{name}</Text>
                </View>
                <Text style={s.previewNote}>
                  A small avatar. A whole lot of you.
                </Text>
              </View>
              <TVFocusGuideView
                key={ready ? 'ready' : 'editor'}
                autoFocus
                style={s.customizer}>
                {ready ? (
                  <View style={s.readyPanel}>
                    <Text style={s.cardTitle}>That’s your look.</Text>
                    <Text style={s.readyCopy}>
                      Your avatar is ready for Third Space.{'\n'}There’s a seat
                      waiting in the garden.
                    </Text>
                    <View style={s.summary}>
                      <Text testID="avatar-summary" style={s.summaryText}>
                        {look.hair} hair · {look.face} face · {look.body} body
                      </Text>
                    </View>
                    <Control
                      preferred
                      primary
                      label="Enter the garden"
                      onPress={() => setInGarden(true)}
                      testID="enter-garden"
                    />
                    <Control
                      label="Keep customizing"
                      primary
                      onPress={() => setReady(false)}
                    />
                    <Text style={s.sessionNote}>
                      Your look stays for this session.
                    </Text>
                  </View>
                ) : (
                  <>
                    <View style={s.tabs}>
                      {(['Hair', 'Face', 'Body'] as Category[]).map(
                        (tab, i) => (
                          <Control
                            key={tab}
                            preferred={i === 0}
                            label={`0${i + 1}  ${tab}`}
                            selected={category === tab}
                            onPress={() => setCategory(tab)}
                            testID={`tab-${tab}`}
                          />
                        ),
                      )}
                    </View>
                    <View style={s.optionArea}>
                      <Text style={s.sectionTitle}>
                        {category === 'Hair'
                          ? 'A little personality on top.'
                          : category === 'Face'
                          ? 'A face that feels like you.'
                          : 'Find your everyday look.'}
                      </Text>
                      {category === 'Hair' && (
                        <>
                          <Text style={s.groupLabel}>HAIRSTYLE</Text>
                          {choices('hair', ['Crop', 'Waves', 'Bob', 'Bald'])}
                          <Text style={s.groupLabel}>HAIR COLOR</Text>
                          {colors('hairColor', hairColors)}
                        </>
                      )}
                      {category === 'Face' && (
                        <>
                          <Text style={s.groupLabel}>SKIN TONE</Text>
                          {colors('skin', skinColors)}
                          <Text style={s.groupLabel}>FACE SHAPE</Text>
                          {choices('face', ['Round', 'Oval', 'Square'])}
                          <Text style={s.groupLabel}>EXPRESSION</Text>
                          {choices('expression', ['Smile', 'Calm', 'Grin'])}
                        </>
                      )}
                      {category === 'Body' && (
                        <>
                          <Text style={s.groupLabel}>BODY SHAPE</Text>
                          {choices('body', ['Regular', 'Broad', 'Slim'])}
                          <Text style={s.groupLabel}>SHIRT COLOR</Text>
                          {colors('shirt', shirtColors)}
                        </>
                      )}
                    </View>
                    <View style={s.editorActions}>
                      <Text style={s.actionHint}>
                        No perfect look. Just your look.
                      </Text>
                      <Control
                        label="This is me"
                        primary
                        onPress={() => setReady(true)}
                        testID="avatar-finish"
                      />
                    </View>
                  </>
                )}
              </TVFocusGuideView>
            </View>
          </View>
        )}
        <View style={s.footer}>
          <Text style={s.footerText}>
            AN INTERNET BENCH. A LITTLE HUMAN CONNECTION.
          </Text>
          <Text style={s.remoteHint}>↑ ↓ ← → Move OK Select Back Return</Text>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: {flex: 1, backgroundColor: '#F4F1E8'},
  stage: {
    position: 'absolute',
    width: 1280,
    height: 720,
    backgroundColor: '#F4F1E8',
    paddingHorizontal: 60,
    paddingTop: 28,
  },
  header: {
    height: 57,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderColor: '#DCDDD1',
  },
  brand: {flexDirection: 'row', gap: 14, alignItems: 'center'},
  wordmark: {
    fontSize: 29,
    fontWeight: '700',
    color: '#294D43',
    letterSpacing: -1,
  },
  brandDot: {color: '#D78154'},
  headerNote: {fontSize: 13, color: '#6F7D70', letterSpacing: 1},
  loginLayout: {height: 550, paddingTop: 16, alignItems: 'center'},
  hero: {width: '100%', alignItems: 'center'},
  eyebrow: {
    fontSize: 12,
    letterSpacing: 2,
    fontWeight: '600',
    color: '#6F806E',
  },
  heroTitle: {
    fontSize: 32,
    lineHeight: 39,
    letterSpacing: -0.8,
    color: '#29463B',
    fontWeight: '500',
    marginTop: 7,
  },
  benchScene: {width: 680, height: 270, marginTop: 2},
  bench: {position: 'absolute', width: 290, height: 95, top: 164, left: 215},
  miniBench: {width: 32, height: 26},
  slat: {position: 'absolute', width: '100%', borderRadius: 3},
  seat: {
    position: 'absolute',
    top: 49,
    height: 12,
    width: '100%',
    backgroundColor: '#B98550',
    borderRadius: 3,
  },
  miniSeat: {top: 16, height: 4, backgroundColor: '#294D43'},
  benchLeg: {
    position: 'absolute',
    top: 58,
    height: 32,
    width: 8,
    backgroundColor: '#405B49',
  },
  miniLeg: {top: 18, height: 8, width: 3},
  onlineDot: {width: 7, height: 7, borderRadius: 4, backgroundColor: '#92B88B'},
  loginCard: {width: 820, alignItems: 'center', marginTop: 2},
  loginFields: {flexDirection: 'row', gap: 20, width: '100%'},
  loginField: {flex: 1},
  loginButton: {width: 300},
  cardKicker: {
    fontSize: 11,
    letterSpacing: 2,
    color: '#86917C',
    fontWeight: '600',
  },
  cardTitle: {fontSize: 34, color: '#29463B', fontWeight: '500', marginTop: 10},
  cardCopy: {fontSize: 17, color: '#7A8478', marginTop: 6, marginBottom: 14},
  fieldLabel: {
    fontSize: 14,
    color: '#405B49',
    marginBottom: 7,
    marginTop: 11,
    fontWeight: '600',
  },
  input: {
    height: 54,
    borderRadius: 11,
    borderWidth: 3,
    borderColor: '#E8E9E0',
    paddingHorizontal: 15,
    paddingVertical: 8,
    fontSize: 18,
    color: '#29463B',
    backgroundColor: '#F6F6EF',
  },
  inputFocused: {borderColor: '#D78154'},
  error: {
    fontSize: 13,
    color: '#A33E31',
    marginTop: 5,
    minHeight: 23,
    textAlign: 'center',
  },
  demoNote: {
    fontSize: 10,
    letterSpacing: 1.5,
    color: '#7B8973',
    textAlign: 'center',
    marginTop: 12,
  },
  demoCopy: {
    fontSize: 12,
    lineHeight: 17,
    color: '#8B9185',
    textAlign: 'center',
    marginTop: 7,
  },
  editor: {paddingTop: 25},
  editorHeading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  editorTitle: {
    fontSize: 35,
    color: '#29463B',
    marginTop: 7,
    fontWeight: '500',
  },
  editorColumns: {flexDirection: 'row', gap: 26, marginTop: 23},
  preview: {
    width: 347,
    height: 438,
    borderRadius: 23,
    backgroundColor: '#294D43',
    alignItems: 'center',
    overflow: 'hidden',
  },
  previewKicker: {
    fontSize: 11,
    letterSpacing: 2.5,
    color: '#C0D0B7',
    marginTop: 24,
  },
  avatarHalo: {
    position: 'absolute',
    top: 62,
    width: 264,
    height: 264,
    backgroundColor: '#547262',
    borderRadius: 150,
  },
  avatarPosition: {position: 'absolute', top: 45},
  namePill: {
    position: 'absolute',
    bottom: 45,
    backgroundColor: '#203E35',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 19,
    paddingVertical: 9,
    borderRadius: 25,
    gap: 10,
  },
  previewName: {fontSize: 18, fontWeight: '600', color: '#FFF4DE'},
  previewNote: {
    position: 'absolute',
    bottom: 19,
    color: '#BFCEB8',
    fontSize: 12,
  },
  customizer: {
    width: 787,
    height: 438,
    backgroundColor: '#FFFEF8',
    borderWidth: 1,
    borderColor: '#E2E1D7',
    borderRadius: 23,
    padding: 23,
  },
  tabs: {
    flexDirection: 'row',
    gap: 12,
    borderBottomWidth: 1,
    borderColor: '#E6E6DC',
    paddingBottom: 12,
  },
  optionArea: {flex: 1},
  sectionTitle: {
    fontSize: 20,
    color: '#405B49',
    marginTop: 12,
    marginBottom: 2,
  },
  groupLabel: {
    fontSize: 10,
    letterSpacing: 1.5,
    fontWeight: '600',
    color: '#8B947F',
    marginTop: 8,
    marginBottom: 6,
  },
  options: {flexDirection: 'row', gap: 9},
  editorActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderColor: '#E6E6DC',
  },
  actionHint: {fontSize: 13, color: '#8A9381'},
  readyPanel: {flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8},
  readyCopy: {
    fontSize: 16,
    lineHeight: 22,
    color: '#7A8478',
    textAlign: 'center',
  },
  summary: {padding: 14, backgroundColor: '#F1F2E8', borderRadius: 10},
  summaryText: {fontSize: 16, color: '#405B49'},
  sessionNote: {fontSize: 12, color: '#8A9381'},
  footer: {
    position: 'absolute',
    bottom: 26,
    left: 60,
    right: 60,
    borderTopWidth: 1,
    borderColor: '#DCDDD1',
    paddingTop: 17,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footerText: {fontSize: 10, letterSpacing: 1.7, color: '#85917D'},
  remoteHint: {fontSize: 12, color: '#768470'},
});
