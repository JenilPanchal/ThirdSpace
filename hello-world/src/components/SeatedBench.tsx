import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {Avatar, AvatarLook} from './Avatar';

export function ScaledAvatar({
  look,
  seated = false,
  scale = 0.42,
}: {
  look: AvatarLook;
  seated?: boolean;
  scale?: number;
}) {
  return (
    <View style={{width: 260 * scale, height: 340 * scale}}>
      <View
        style={{
          position: 'absolute',
          left: (260 * scale - 260) / 2,
          top: (340 * scale - 340) / 2,
          transform: [{scale}],
        }}>
        <Avatar look={look} seated={seated} />
      </View>
    </View>
  );
}
export function SeatedBench({
  people,
  large = false,
}: {
  people: {id: string; name: string; look: AvatarLook}[];
  large?: boolean;
}) {
  return (
    <View style={[s.bench, large && s.large]}>
      <View style={s.shadow} />
      <View style={[s.leg, {left: 34}]} />
      <View style={[s.leg, {right: 34}]} />
      <View style={s.back}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={s.slat} />
        ))}
      </View>
      <View style={s.seatDepth} />
      <View style={s.seat} />
      <View style={[s.arm, {left: 6}]} />
      <View style={[s.arm, {right: 6}]} />
      {people.slice(0, 3).map((person, i) => (
        <View
          key={person.id}
          style={[s.person, {left: people.length === 1 ? 76 : 15 + i * 68}]}>
          <ScaledAvatar look={person.look} seated />
          <Text numberOfLines={1} style={s.name}>
            {person.name}
          </Text>
        </View>
      ))}
      {people.length > 3 && (
        <Text style={s.more}>+{people.length - 3} listening</Text>
      )}
    </View>
  );
}
const s = StyleSheet.create({
  bench: {width: 260, height: 175},
  large: {transform: [{scale: 1.2}]},
  shadow: {
    position: 'absolute',
    bottom: 1,
    left: 10,
    width: 240,
    height: 15,
    borderRadius: 100,
    backgroundColor: '#344A471A',
  },
  back: {
    position: 'absolute',
    left: 16,
    top: 53,
    width: 228,
    height: 60,
    borderRadius: 12,
    backgroundColor: '#AC7153',
    padding: 5,
    gap: 4,
  },
  slat: {
    height: 13,
    borderRadius: 5,
    backgroundColor: '#DBA47B',
    borderBottomWidth: 2,
    borderColor: '#C48C65',
  },
  seat: {
    position: 'absolute',
    left: 7,
    top: 112,
    width: 246,
    height: 15,
    borderRadius: 8,
    backgroundColor: '#E2B18A',
  },
  seatDepth: {
    position: 'absolute',
    left: 7,
    top: 119,
    width: 246,
    height: 14,
    borderRadius: 6,
    backgroundColor: '#B77C58',
  },
  leg: {
    position: 'absolute',
    top: 121,
    width: 17,
    height: 46,
    borderRadius: 6,
    backgroundColor: '#344A47',
  },
  arm: {
    position: 'absolute',
    top: 96,
    width: 13,
    height: 35,
    borderRadius: 7,
    backgroundColor: '#536B5E',
  },
  person: {position: 'absolute', top: 0, width: 109, alignItems: 'center'},
  name: {
    marginTop: 9,
    backgroundColor: '#FFFCEDD9',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    fontSize: 11,
    color: '#294D43',
    maxWidth: 100,
  },
  more: {
    position: 'absolute',
    bottom: -24,
    left: 90,
    fontSize: 11,
    color: '#294D43',
  },
});
