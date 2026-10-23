export type BeeTurn = {
  id: string;
  text: string;
  speaker: string;
  time?: number | null;
  part?: number;
  originalSpeaker?: string;
};
export type BeeConversation = {
  id: string;
  title: string;
  summary: string;
  startedAt: number | null;
  utterances: BeeTurn[];
  turns: BeeTurn[];
  fingerprint: string;
  review: {
    revision: number;
    corrections: Record<string, {segments: {text: string; speaker: string}[]}>;
  };
};
export type BeeMap = {
  title: string;
  engine: 'transcript' | 'bee-agent';
  branches: {
    label: string;
    items: {text: string; speaker?: string; sourceIds: string[]}[];
  }[];
  reviewRevision: number;
  turns: BeeTurn[];
};
export type BeeRecording = {
  id: string;
  title: string;
  summary: string;
  startedAt: number | null;
};
