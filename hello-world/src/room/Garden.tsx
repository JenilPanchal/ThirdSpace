import React, {useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {AvatarLook} from '../components/Avatar';
import {Control} from '../components/Control';
import {ScaledAvatar, SeatedBench} from '../components/SeatedBench';
import {GardenArt} from '../components/GardenArt';
import {Member} from './useSharedRoom';

const benches = [
  {
    name: 'Jukebox',
    description: 'Music is better together',
    left: 25,
    top: 10,
  },
  {
    name: 'Potrait',
    description: 'A little color, together',
    left: 449,
    top: 10,
  },
  {name: 'Bee', description: 'Your day, a little clearer', left: 866, top: 10},
];
function BenchChoice({
  index,
  selected,
  people,
  onChoose,
}: {
  index: number;
  selected: boolean;
  people: Member[];
  onChoose: () => void;
}) {
  const [focused, setFocused] = useState(false);
  const bench = benches[index];
  return (
    <Pressable
      testID={`garden-bench-${index}`}
      hasTVPreferredFocus={index === 0}
      accessibilityRole="button"
      accessibilityLabel={`${bench.name}. ${
        selected ? 'You are seated here.' : bench.description
      }`}
      accessibilityState={{selected}}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onPress={onChoose}
      style={[
        s.choice,
        {left: bench.left, top: bench.top},
        focused && s.focused,
        selected && s.selected,
      ]}>
      <SeatedBench people={people} />
      <View style={[s.benchLabel, selected && s.selectedLabel]}>
        <Text style={[s.benchName, selected && s.light]}>
          {index === 0 ? '♫  ' : ''}
          {bench.name}
          {selected ? '  ✓' : ''}
        </Text>
        <Text style={[s.benchDetail, selected && s.light]}>
          {selected ? 'Your seat' : bench.description}
        </Text>
      </View>
    </Pressable>
  );
}
export function Garden({
  name,
  look,
  memberId,
  members,
  selected,
  onChoose,
  onEdit,
  code,
  error,
}: {
  name: string;
  look: AvatarLook;
  memberId: string;
  members: Member[];
  selected: number | null;
  onChoose: (index: number) => void;
  onEdit: () => void;
  code?: string;
  error: string;
}) {
  const all = members.length
    ? members
    : [{id: memberId, name, look, bench: selected}];
  return (
    <View style={s.root}>
      <View style={s.heading}>
        <View>
          <Text style={s.kicker}>A LITTLE OUTSIDE, ONLINE</Text>
          <Text style={s.title}>Welcome to the garden, {name}.</Text>
        </View>
        <Control label="Edit avatar" onPress={onEdit} />
      </View>
      <View style={s.garden}>
        <GardenArt />
        <View style={s.roomPill}>
          <View style={s.dot} />
          <Text style={s.roomText}>
            {code
              ? `ROOM ${code} · ${members.length} here`
              : 'Your garden · choose a bench'}
          </Text>
        </View>
        {benches.map((bench, index) => (
          <BenchChoice
            key={bench.name}
            index={index}
            selected={selected === index}
            people={all.filter((member) => member.bench === index)}
            onChoose={() => onChoose(index)}
          />
        ))}
        {selected === null && (
          <View style={s.arrival}>
            <ScaledAvatar look={look} scale={0.31} />
            <Text style={s.arrivalName}>{name}</Text>
          </View>
        )}
        <View style={s.instruction}>
          <Text style={s.instructionText}>
            {selected === null
              ? 'Choose a bench to take a seat.'
              : selected === 0
              ? 'Your seat at Jukebox is waiting.'
              : 'You’re seated. Take your time, or choose another bench.'}
          </Text>
        </View>
      </View>
      <Text style={s.error} accessibilityLiveRegion="polite">
        {error ||
          'Jukebox for music. Potrait for shared pixel art. Bee for your conversations and ideas.'}
      </Text>
    </View>
  );
}
const s = StyleSheet.create({
  root: {paddingTop: 20},
  heading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  kicker: {fontSize: 11, letterSpacing: 2, color: '#7B8A71'},
  title: {fontSize: 29, color: '#294D43', marginTop: 5, fontWeight: '500'},
  garden: {
    width: 1160,
    height: 443,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#B9CB9D',
  },
  background: {position: 'absolute', width: '100%', height: '100%'},
  roomPill: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: '#FFFCEDD9',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
  },
  dot: {width: 7, height: 7, borderRadius: 4, backgroundColor: '#609A60'},
  roomText: {fontSize: 12, color: '#294D43'},
  choice: {
    position: 'absolute',
    width: 270,
    height: 218,
    alignItems: 'center',
    paddingTop: 5,
    borderWidth: 3,
    borderRadius: 22,
    borderColor: 'transparent',
  },
  focused: {
    borderColor: '#F5D8A5',
    backgroundColor: '#FFF4DF25',
    transform: [{scale: 1.025}],
  },
  selected: {borderColor: '#FFFFFF'},
  benchLabel: {
    backgroundColor: '#FFFBEFEE',
    borderRadius: 14,
    paddingHorizontal: 17,
    paddingVertical: 8,
    alignItems: 'center',
  },
  selectedLabel: {backgroundColor: '#294D43'},
  benchName: {fontSize: 16, color: '#294D43', fontWeight: '700'},
  benchDetail: {fontSize: 10, color: '#6D7C65', marginTop: 3},
  light: {color: '#FFF5DE'},
  arrival: {position: 'absolute', left: 515, bottom: 38, alignItems: 'center'},
  arrivalName: {
    fontSize: 12,
    color: '#294D43',
    backgroundColor: '#FFFBEFCC',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  instruction: {
    position: 'absolute',
    left: 240,
    right: 240,
    bottom: 14,
    alignItems: 'center',
  },
  instructionText: {
    fontSize: 13,
    color: '#294D43',
    backgroundColor: '#FFFBEFDE',
    paddingHorizontal: 17,
    paddingVertical: 9,
    borderRadius: 17,
  },
  error: {fontSize: 12, color: '#7A816C', marginTop: 12, textAlign: 'center'},
});
