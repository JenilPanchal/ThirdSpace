import React, {memo, useCallback, useEffect, useRef, useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {Control} from '../components/Control';
import {Room, RoomAction, Session} from './useSharedRoom';

const Pixel = memo(function Pixel({
  x,
  y,
  color,
  onPlace,
  onPoint,
}: {
  x: number;
  y: number;
  color: string;
  onPlace: (x: number, y: number) => void;
  onPoint: (x: number, y: number) => void;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <Pressable
      testID={`pixel-${x}-${y}`}
      accessibilityRole="button"
      accessibilityLabel={`Pixel ${x + 1}, ${y + 1}, ${color}`}
      hasTVPreferredFocus={x === 16 && y === 12}
      onFocus={() => {
        setFocused(true);
        onPoint(x, y);
      }}
      onBlur={() => setFocused(false)}
      onPress={() => onPlace(x, y)}
      style={[s.pixel, {backgroundColor: color}, focused && s.pixelFocus]}
    />
  );
});
const PixelRow = memo(function PixelRow({
  row,
  y,
  onPlace,
  onPoint,
}: {
  row: string;
  y: number;
  onPlace: (x: number, y: number) => void;
  onPoint: (x: number, y: number) => void;
}) {
  return (
    <View style={s.row}>
      {row.split(',').map((color, x) => (
        <Pixel
          key={x}
          x={x}
          y={y}
          color={color}
          onPlace={onPlace}
          onPoint={onPoint}
        />
      ))}
    </View>
  );
});
function Swatch({
  color,
  selected,
  onChoose,
}: {
  color: string;
  selected: boolean;
  onChoose: () => void;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <Pressable
      testID={`color-${color.slice(1)}`}
      accessibilityRole="button"
      accessibilityLabel={`Paint ${color}`}
      accessibilityState={{selected}}
      onPress={onChoose}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={[
        s.swatch,
        {backgroundColor: color},
        selected && s.swatchSelected,
        focused && s.swatchFocus,
      ]}>
      <Text style={{color: color === '#FFF9EB' ? '#344A47' : '#FFFFFF'}}>
        {selected ? '✓' : ''}
      </Text>
    </Pressable>
  );
}
export function Potrait({
  room,
  session,
  busy,
  error,
  onAction,
  onBack,
  onSettings,
  onRetry,
}: {
  room: Room | null;
  session: Session | null;
  busy: boolean;
  error: string;
  onAction: (action: RoomAction) => Promise<boolean>;
  onBack: () => void;
  onSettings: () => void;
  onRetry: () => void;
}) {
  const [color, setColor] = useState('#D88761');
  const [point, setPoint] = useState({x: 16, y: 12});
  const [notice, setNotice] = useState('');
  const [clock, setClock] = useState(Date.now());
  const receivedAt = useRef(Date.now());
  useEffect(() => {
    receivedAt.current = Date.now();
  }, [room]);
  useEffect(() => {
    const timer = setInterval(() => setClock(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const canvas = room?.canvas;
  const serverNow =
    (room?.serverTime || clock) + Math.max(0, clock - receivedAt.current);
  const seconds = canvas
    ? Math.max(0, Math.ceil((canvas.budget.resetAt - serverNow) / 1000))
    : 0;
  const available =
    canvas && canvas.budget.resetAt > 0 && seconds === 0
      ? 2
      : canvas?.budget.remaining || 0;
  const handler = useRef({onAction, busy, color, available});
  handler.current = {onAction, busy, color, available};
  const place = useCallback(async (x: number, y: number) => {
    const current = handler.current;
    if (current.busy) {
      return;
    }
    if (current.available <= 0) {
      setNotice('A little pause. Your next two pixels will be ready soon.');
      return;
    }
    if (await current.onAction({type: 'pixel', x, y, color: current.color})) {
      setNotice('Your pixel is part of the picture.');
    }
  }, []);
  const onPoint = useCallback((x: number, y: number) => setPoint({x, y}), []);
  return (
    <View style={s.root}>
      <View style={s.heading}>
        <View>
          <Text style={s.kicker}>BENCH 02 · MAKE SOMETHING TOGETHER</Text>
          <Text style={s.title}>Potrait</Text>
        </View>
        <View style={s.share}>
          <Text style={s.shareCode}>
            {session
              ? `ROOM ${session.code} · SHARE THE CANVAS`
              : 'FINDING YOUR CANVAS…'}
          </Text>
          <Text selectable style={s.shareLink}>
            {session
              ? `${session.shareUrl}&bench=1`
              : 'A blank square. A shared idea.'}
          </Text>
        </View>
        <Control label="Join friends" onPress={onSettings} />
        <Control
          label="Back to garden"
          onPress={onBack}
          testID="potrait-back"
        />
      </View>
      <View style={s.columns}>
        <View style={s.canvasPanel}>
          <View style={s.canvasTop}>
            <Text style={s.kicker}>THE SHARED CANVAS · 32 × 24</Text>
            <Text style={s.coordinate}>
              {point.x + 1}, {point.y + 1}
            </Text>
          </View>
          {canvas ? (
            <View style={s.board} testID="pixel-canvas">
              {Array.from({length: canvas.height}, (_, y) => (
                <PixelRow
                  key={y}
                  y={y}
                  row={canvas.pixels
                    .slice(y * canvas.width, (y + 1) * canvas.width)
                    .join(',')}
                  onPlace={place}
                  onPoint={onPoint}
                />
              ))}
            </View>
          ) : (
            <View style={s.waiting}>
              <Text style={s.waitingTitle}>
                {busy ? 'Finding your canvas…' : 'Your canvas is waiting.'}
              </Text>
              <Text style={s.copy}>
                Join the garden to paint with everyone.
              </Text>
              <Control
                label={busy ? 'Connecting…' : 'Try again'}
                disabled={busy}
                onPress={onRetry}
              />
            </View>
          )}
          <Text style={s.hint}>
            D-pad to choose a square · Select to place a pixel · Move right off
            the edge for colors
          </Text>
        </View>
        <View style={s.panel}>
          <Text style={s.kicker}>SMALL MARKS. ONE BIG PICTURE.</Text>
          <Text style={s.panelTitle}>Leave a little color.</Text>
          <View style={s.budget}>
            <Text testID="pixel-budget" style={s.budgetNumber}>
              {available}/2
            </Text>
            <View>
              <Text style={s.budgetTitle}>pixels ready</Text>
              <Text testID="pixel-countdown" style={s.copy}>
                {canvas?.budget.resetAt && seconds > 0
                  ? `Refills in ${seconds}s`
                  : 'Two fresh pixels every minute'}
              </Text>
            </View>
          </View>
          <Text style={s.label}>YOUR COLOR</Text>
          <View style={s.palette}>
            {(canvas?.palette || []).map((item) => (
              <Swatch
                key={item}
                color={item}
                selected={color === item}
                onChoose={() => setColor(item)}
              />
            ))}
          </View>
          <Text style={s.copy}>
            Build a face, a flower, a whole world. Every player gets two pixels
            per minute. You can paint over any square.
          </Text>
          <Text style={s.label}>ON THIS BENCH</Text>
          <Text numberOfLines={2} style={s.members}>
            {room?.members
              .filter((member) => member.bench === 1)
              .map((member) => member.name)
              .join(' · ') || 'A seat for you and your people.'}
          </Text>
          <Text style={s.status} accessibilityLiveRegion="polite">
            {error ||
              notice ||
              'New players join the same canvas using your room code.'}
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
    gap: 12,
    marginBottom: 18,
  },
  kicker: {fontSize: 11, letterSpacing: 1.5, color: '#7B8A71'},
  title: {fontSize: 30, color: '#294D43', marginTop: 4},
  share: {flex: 1, alignItems: 'center'},
  shareCode: {fontSize: 16, fontWeight: '700', color: '#294D43'},
  shareLink: {fontSize: 12, color: '#7A8976', marginTop: 6},
  columns: {flexDirection: 'row', gap: 20},
  canvasPanel: {
    width: 736,
    height: 478,
    borderRadius: 22,
    backgroundColor: '#E7E8D8',
    alignItems: 'center',
    padding: 16,
  },
  canvasTop: {
    width: 512,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  coordinate: {fontSize: 12, color: '#6E8069'},
  board: {width: 512, height: 384, backgroundColor: '#FFF9EB'},
  row: {flexDirection: 'row', height: 16},
  pixel: {width: 16, height: 16, borderWidth: 0.5, borderColor: '#344A4714'},
  pixelFocus: {
    borderWidth: 2,
    borderColor: '#D88761',
    transform: [{scale: 1.3}],
    zIndex: 3,
  },
  hint: {fontSize: 11, color: '#6E8069', marginTop: 14},
  waiting: {
    width: 512,
    height: 384,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  waitingTitle: {fontSize: 24, color: '#294D43'},
  panel: {
    width: 404,
    height: 478,
    borderRadius: 22,
    backgroundColor: '#FFFEF7',
    padding: 20,
  },
  panelTitle: {fontSize: 24, color: '#294D43', marginTop: 8},
  budget: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    marginTop: 12,
    marginBottom: 16,
  },
  budgetNumber: {fontSize: 44, fontWeight: '600', color: '#D88761'},
  budgetTitle: {fontSize: 17, color: '#294D43'},
  copy: {fontSize: 13, lineHeight: 19, color: '#7A8976', marginTop: 4},
  label: {
    fontSize: 10,
    letterSpacing: 1.5,
    color: '#7B8A71',
    marginTop: 14,
    marginBottom: 8,
  },
  palette: {flexDirection: 'row', flexWrap: 'wrap', gap: 7},
  swatch: {
    width: 38,
    height: 30,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#344A4718',
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchSelected: {borderWidth: 3, borderColor: '#344A47'},
  swatchFocus: {
    borderWidth: 3,
    borderColor: '#D88761',
    transform: [{scale: 1.1}],
  },
  members: {fontSize: 15, color: '#294D43'},
  status: {fontSize: 12, lineHeight: 18, color: '#7A8976', marginTop: 12},
});
