import React from 'react';
import {StyleSheet, Text, View} from 'react-native';

// The same native, rounded shapes and palette used by the customizable avatar.
export function GardenArt({path = true}: {path?: boolean}) {
  return (
    <View style={s.garden} pointerEvents="none" accessible={false}>
      <View style={s.lawn} />
      {path && (
        <View style={s.road}>
          <View style={s.island} />
        </View>
      )}
      {[4, 23, 48, 72, 91].map((left, i) => (
        <View
          key={left}
          style={[s.bush, {left: `${left}%`, top: i % 2 ? 15 : 30}]}>
          <View style={s.leaf} />
        </View>
      ))}
      {[8, 21, 37, 63, 79, 93].map((left, i) => (
        <View
          key={left}
          style={[s.flower, {left: `${left}%`, top: i % 2 ? '91%' : '54%'}]}>
          <View style={s.stem} />
          <View
            style={[s.petals, {backgroundColor: i % 2 ? '#E3AC80' : '#F8E9B4'}]}
          />
          <View style={s.center} />
        </View>
      ))}
    </View>
  );
}
export function JukeboxArt() {
  return (
    <View
      style={s.jukebox}
      accessible
      accessibilityLabel="A rounded terracotta and sage jukebox">
      <View style={s.jukeDepth} />
      <View style={s.jukeFront}>
        <View style={s.arch}>
          <View style={s.record}>
            <View style={s.recordLabel} />
          </View>
        </View>
        <View style={s.display}>
          <Text style={s.music}>♫</Text>
          <Text style={s.brand}>third space</Text>
        </View>
        <View style={s.buttons}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={s.button} />
          ))}
        </View>
        <View style={s.speaker}>
          {[0, 1, 2, 3, 4].map((i) => (
            <View key={i} style={s.slot} />
          ))}
        </View>
      </View>
    </View>
  );
}
const s = StyleSheet.create({
  garden: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: '#B6CA9D',
  },
  lawn: {
    position: 'absolute',
    left: '5%',
    top: '6%',
    width: '90%',
    height: '88%',
    backgroundColor: '#BDD0A7',
    borderRadius: 100,
  },
  road: {
    position: 'absolute',
    left: '6%',
    top: '55%',
    width: '88%',
    height: '39%',
    borderRadius: 500,
    backgroundColor: '#E9D8B6',
    borderWidth: 3,
    borderColor: '#D0BC96',
    padding: 22,
  },
  island: {
    flex: 1,
    borderRadius: 400,
    backgroundColor: '#A9C18F',
    borderWidth: 2,
    borderColor: '#98B27E',
  },
  bush: {
    position: 'absolute',
    width: 65,
    height: 46,
    borderRadius: 30,
    backgroundColor: '#8BA77C',
  },
  leaf: {
    position: 'absolute',
    left: 17,
    top: -12,
    width: 42,
    height: 48,
    borderRadius: 30,
    backgroundColor: '#9DB98A',
  },
  flower: {position: 'absolute', width: 18, height: 26},
  stem: {
    position: 'absolute',
    left: 8,
    top: 8,
    width: 3,
    height: 19,
    borderRadius: 2,
    backgroundColor: '#6C9065',
  },
  petals: {width: 17, height: 17, borderRadius: 8},
  center: {
    position: 'absolute',
    left: 6,
    top: 6,
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#C38659',
  },
  jukebox: {width: 170, height: 290},
  jukeDepth: {
    position: 'absolute',
    left: 10,
    top: 9,
    width: 158,
    height: 276,
    borderRadius: 78,
    backgroundColor: '#A8664B',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  jukeFront: {
    width: 158,
    height: 276,
    borderRadius: 78,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    backgroundColor: '#D88761',
    borderWidth: 5,
    borderColor: '#774E3D',
    padding: 10,
    alignItems: 'center',
  },
  arch: {
    width: 122,
    height: 100,
    borderTopLeftRadius: 61,
    borderTopRightRadius: 61,
    backgroundColor: '#EBCB93',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#F8E8C8',
  },
  record: {
    width: 69,
    height: 69,
    borderRadius: 35,
    backgroundColor: '#344A47',
    borderWidth: 7,
    borderColor: '#4E6257',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordLabel: {
    width: 21,
    height: 21,
    borderRadius: 12,
    backgroundColor: '#D88761',
    borderWidth: 7,
    borderColor: '#F3DCA9',
  },
  display: {
    width: 120,
    height: 48,
    backgroundColor: '#344A47',
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  music: {fontSize: 20, color: '#F5DCA9'},
  brand: {fontSize: 10, color: '#E8DEC5'},
  buttons: {flexDirection: 'row', gap: 12, marginVertical: 10},
  button: {width: 15, height: 10, borderRadius: 5, backgroundColor: '#F7E9CB'},
  speaker: {
    width: 104,
    height: 60,
    borderRadius: 15,
    backgroundColor: '#A9654C',
    padding: 10,
    gap: 5,
  },
  slot: {height: 3, borderRadius: 2, backgroundColor: '#644C40'},
});
