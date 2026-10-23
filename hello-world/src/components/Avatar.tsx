import React from 'react';
import {StyleSheet, View} from 'react-native';

export type AvatarLook = {
  hair: 'Crop' | 'Waves' | 'Bob' | 'Bald';
  hairColor: string;
  skin: string;
  face: 'Round' | 'Oval' | 'Square';
  expression: 'Smile' | 'Calm' | 'Grin';
  body: 'Regular' | 'Broad' | 'Slim';
  shirt: string;
};
export const initialLook: AvatarLook = {
  hair: 'Waves',
  hairColor: '#3D2925',
  skin: '#DDA478',
  face: 'Round',
  expression: 'Smile',
  body: 'Regular',
  shirt: '#D88761',
};

// Independent native shapes make the avatar customizable without image downloads.
export function Avatar({
  look,
  small = false,
  seated = false,
}: {
  look: AvatarLook;
  small?: boolean;
  seated?: boolean;
}) {
  const bodyWidth =
    look.body === 'Broad' ? 190 : look.body === 'Slim' ? 132 : 162;
  const headWidth = look.face === 'Oval' ? 110 : 126;
  return (
    <View
      style={small ? s.smallFrame : s.frame}
      accessible
      accessibilityLabel={`${
        look.hair
      } hair, ${look.face.toLowerCase()} face, ${look.expression.toLowerCase()} expression, ${look.body.toLowerCase()} body`}>
      <View style={[s.figure, small && s.smallFigure]}>
        <View style={s.shadow} />
        {seated && <View style={s.lap} />}
        <View style={[s.leg, seated && s.seatedLeg, {left: 85}]} />
        <View style={[s.leg, seated && s.seatedLeg, {right: 85}]} />
        <View style={[s.shoe, {left: 71}]} />
        <View style={[s.shoe, {right: 71}]} />
        <View
          style={[
            s.arm,
            {
              left: 130 - bodyWidth / 2 - 12,
              backgroundColor: look.skin,
              transform: [{rotate: '9deg'}],
            },
          ]}
        />
        <View
          style={[
            s.arm,
            {
              right: 130 - bodyWidth / 2 - 12,
              backgroundColor: look.skin,
              transform: [{rotate: '-9deg'}],
            },
          ]}
        />
        <View
          style={[
            s.body,
            seated && {height: 92},
            {
              width: bodyWidth,
              left: (260 - bodyWidth) / 2,
              backgroundColor: look.shirt,
            },
          ]}
        />
        <View style={[s.collar, {backgroundColor: look.skin}]} />
        {look.hair === 'Bob' && (
          <View style={[s.bob, {backgroundColor: look.hairColor}]} />
        )}
        <View style={[s.ear, {left: 63, backgroundColor: look.skin}]} />
        <View style={[s.ear, {right: 63, backgroundColor: look.skin}]} />
        <View
          style={[
            s.head,
            {
              width: headWidth,
              left: (260 - headWidth) / 2,
              borderRadius: look.face === 'Square' ? 30 : 60,
              backgroundColor: look.skin,
            },
          ]}>
          <View style={[s.brow, {left: 24}]} />
          <View style={[s.brow, {right: 24}]} />
          <View style={[s.eye, {left: 31}]} />
          <View style={[s.eye, {right: 31}]} />
          <View style={s.nose} />
          <View style={[s.cheek, {left: 15}]} />
          <View style={[s.cheek, {right: 15}]} />
          <View
            style={[
              s.mouth,
              look.expression === 'Calm' && s.calm,
              look.expression === 'Grin' && s.grin,
            ]}
          />
        </View>
        {look.hair !== 'Bald' && (
          <View
            style={[
              s.hair,
              {backgroundColor: look.hairColor},
              look.hair === 'Crop' && s.crop,
              look.hair === 'Bob' && s.bobTop,
            ]}
          />
        )}
        {look.hair === 'Waves' &&
          [0, 1, 2, 3].map((i) => (
            <View
              key={i}
              style={[
                s.wave,
                {
                  left: 64 + i * 28,
                  top: 30 - (i % 2) * 9,
                  backgroundColor: look.hairColor,
                },
              ]}
            />
          ))}
        <View style={s.shirtSeam} />
      </View>
    </View>
  );
}
const s = StyleSheet.create({
  seatedLeg: {top: 282, height: 36, width: 28},
  lap: {
    position: 'absolute',
    top: 265,
    left: 80,
    width: 100,
    height: 25,
    borderRadius: 12,
    backgroundColor: '#344A47',
  },
  frame: {width: 260, height: 340},
  smallFrame: {width: 130, height: 170},
  figure: {width: 260, height: 340},
  smallFigure: {
    position: 'absolute',
    top: -85,
    left: -65,
    transform: [{scale: 0.5}],
  },
  shadow: {
    position: 'absolute',
    bottom: 1,
    left: 41,
    width: 178,
    height: 17,
    borderRadius: 100,
    backgroundColor: '#00000018',
  },
  head: {position: 'absolute', top: 44, height: 130},
  ear: {
    position: 'absolute',
    top: 100,
    width: 24,
    height: 32,
    borderRadius: 14,
  },
  body: {
    position: 'absolute',
    top: 177,
    height: 113,
    borderTopLeftRadius: 52,
    borderTopRightRadius: 52,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  collar: {
    position: 'absolute',
    left: 112,
    top: 163,
    width: 36,
    height: 33,
    borderRadius: 18,
  },
  arm: {
    position: 'absolute',
    top: 210,
    width: 29,
    height: 84,
    borderRadius: 18,
  },
  leg: {
    position: 'absolute',
    top: 270,
    width: 39,
    height: 56,
    backgroundColor: '#344A47',
    borderRadius: 12,
  },
  shoe: {
    position: 'absolute',
    bottom: 7,
    width: 55,
    height: 20,
    backgroundColor: '#F8F1DD',
    borderRadius: 9,
    borderBottomWidth: 4,
    borderColor: '#C9BFA9',
  },
  hair: {
    position: 'absolute',
    top: 31,
    left: 64,
    width: 132,
    height: 54,
    borderTopLeftRadius: 56,
    borderTopRightRadius: 56,
    borderBottomRightRadius: 30,
    borderBottomLeftRadius: 12,
  },
  crop: {top: 37, height: 39},
  bobTop: {height: 48, borderBottomRightRadius: 9},
  bob: {
    position: 'absolute',
    left: 59,
    top: 39,
    width: 142,
    height: 142,
    borderRadius: 45,
  },
  wave: {position: 'absolute', width: 48, height: 48, borderRadius: 28},
  brow: {
    position: 'absolute',
    top: 47,
    width: 19,
    height: 4,
    borderRadius: 3,
    backgroundColor: '#45352F',
  },
  eye: {
    position: 'absolute',
    top: 61,
    width: 8,
    height: 11,
    borderRadius: 5,
    backgroundColor: '#302D2A',
  },
  nose: {
    position: 'absolute',
    left: '46%',
    top: 70,
    width: 9,
    height: 15,
    borderRadius: 6,
    backgroundColor: '#00000014',
  },
  cheek: {
    position: 'absolute',
    top: 81,
    width: 20,
    height: 10,
    borderRadius: 12,
    backgroundColor: '#C96B5838',
  },
  mouth: {
    position: 'absolute',
    top: 94,
    left: '36%',
    width: 34,
    height: 15,
    borderBottomWidth: 3,
    borderColor: '#603C32',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  calm: {top: 101, height: 2, width: 26, left: '39%', borderRadius: 2},
  grin: {
    backgroundColor: '#FFF5E9',
    height: 19,
    borderWidth: 2,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  shirtSeam: {
    position: 'absolute',
    top: 213,
    left: 139,
    width: 22,
    height: 19,
    borderWidth: 2,
    borderColor: '#FFFFFF40',
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
});
