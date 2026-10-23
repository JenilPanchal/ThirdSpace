import {useCallback, useEffect, useRef, useState} from 'react';
import {AvatarLook} from '../components/Avatar';

export type Member = {
  id: string;
  name: string;
  look: AvatarLook;
  bench: number | null;
};
export type Song = {
  id: string;
  videoId: string;
  title: string;
  addedBy: string;
  memberId: string;
  duration: number | null;
};
export type PixelCanvas = {
  width: number;
  height: number;
  pixels: string[];
  palette: string[];
  budget: {remaining: number; resetAt: number};
  cooldownMs: number;
};
export type Room = {
  canvas?: PixelCanvas;
  code: string;
  revision: number;
  serverTime: number;
  playing: boolean;
  position: number;
  current: Song | null;
  queue: Song[];
  members: Member[];
};
export type Session = {
  server: string;
  code: string;
  shareUrl: string;
  token: string;
  memberId: string;
};
export type MusicResult = {
  videoId: string;
  title: string;
  artist: string;
  thumbnail: string;
};
export type RoomAction = {type: string; [key: string]: unknown};

async function request(
  server: string,
  code: string,
  path: string,
  token = '',
  body?: unknown,
) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(`${server}/api/rooms/${code}${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || 'The garden server is unavailable.');
    }
    return result;
  } finally {
    clearTimeout(timer);
  }
}

export function useSharedRoom(name: string, look: AvatarLook) {
  const [session, setSession] = useState<Session | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const active = useRef<Session | null>(null);
  const mounted = useRef(true);
  const locked = useRef(false);
  const clientId = useRef(
    `player-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  const accept = useCallback(
    (value: Room) =>
      setRoom((old) =>
        old &&
        old.code === value.code &&
        (old.revision > value.revision || old.serverTime > value.serverTime)
          ? old
          : value,
      ),
    [],
  );
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      const current = active.current;
      active.current = null;
      if (current) {
        request(
          current.server,
          current.code,
          '/leave',
          current.token,
          {},
        ).catch(() => {});
      }
    };
  }, []);
  useEffect(() => {
    if (!session) {
      return;
    }
    let stopped = false;
    let pending = false;
    const poll = async () => {
      if (pending) {
        return;
      }
      pending = true;
      try {
        const value = await request(
          session.server,
          session.code,
          '',
          session.token,
        );
        if (!stopped) {
          accept(value);
          setError('');
        }
      } catch (e) {
        if (!stopped) {
          setError(e instanceof Error ? e.message : 'Room connection lost.');
        }
      } finally {
        pending = false;
      }
    };
    const timer = setInterval(poll, 1200);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [session, accept]);
  const join = async (address: string, codeInput = 'AUTO', bench = 0) => {
    if (locked.current) {
      return false;
    }
    const server = address.trim().replace(/\/+$/, '');
    const code = codeInput.trim().toUpperCase();
    if (
      !/^https?:\/\/[^\s/?#]+(?::\d+)?$/.test(server) ||
      !/^[A-Z0-9]{3,12}$/.test(code)
    ) {
      setError(
        'Enter a server URL and a room code of 3–12 letters or numbers.',
      );
      return false;
    }
    locked.current = true;
    setBusy(true);
    setError('');
    try {
      const result = await request(server, code, '/join', '', {
        name,
        look,
        bench,
        clientId: clientId.current,
      });
      if (!mounted.current) {
        request(server, result.room.code, '/leave', result.token, {}).catch(
          () => {},
        );
        return false;
      }
      const value = {
        server,
        code: result.room.code,
        shareUrl: result.shareUrl,
        token: result.token,
        memberId: result.memberId,
      };
      active.current = value;
      setSession(value);
      setRoom(result.room);
      return true;
    } catch (e) {
      if (mounted.current) {
        setError(
          e instanceof Error && e.name !== 'AbortError'
            ? e.message
            : 'Cannot reach the room server. Check its address and Wi-Fi connection.',
        );
      }
      return false;
    } finally {
      locked.current = false;
      if (mounted.current) {
        setBusy(false);
      }
    }
  };
  const action = async (body: RoomAction) => {
    const current = active.current;
    if (!current || locked.current) {
      return false;
    }
    locked.current = true;
    setBusy(true);
    try {
      const value = await request(
        current.server,
        current.code,
        '/action',
        current.token,
        body,
      );
      if (mounted.current && active.current === current) {
        accept(value);
        setError('');
      }
      return true;
    } catch (e) {
      if (mounted.current) {
        setError(e instanceof Error ? e.message : 'Unable to update the room.');
      }
      return false;
    } finally {
      locked.current = false;
      if (mounted.current) {
        setBusy(false);
      }
    }
  };
  const leave = () => {
    const current = active.current;
    active.current = null;
    setSession(null);
    setRoom(null);
    setError('');
    if (current) {
      request(current.server, current.code, '/leave', current.token, {}).catch(
        () => {},
      );
    }
  };
  const search = async (query: string): Promise<MusicResult[]> => {
    const current = active.current;
    if (!current) {
      throw new Error('Connect to a room first.');
    }
    const result = await request(
      current.server,
      current.code,
      `/search?q=${encodeURIComponent(query)}`,
      current.token,
    );
    return result.items;
  };
  return {session, room, error, busy, join, action, leave, search};
}
