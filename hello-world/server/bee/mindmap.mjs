// An honest extractive fallback: every node links to the actual reviewed turns.
export function transcriptMap(conversation, turns) {
  const groups = [
    {label: 'Key ideas', items: []},
    {label: 'Decisions & plans', items: []},
    {label: 'Actions', items: []},
    {label: 'Open questions', items: []},
  ];
  for (const turn of turns) {
    let index = /\?|\b(who|why|how|does|can you)\b/i.test(turn.text)
      ? 3
      : /\b(i will|i’ll|we will|we’ll|todo|action|assign|send|bring|finish|complete)\b/i.test(
          turn.text,
        )
      ? 2
      : /\b(decid|agreed|plan|deadline|friday|monday|tomorrow|next week)\b/i.test(
          turn.text,
        )
      ? 1
      : 0;
    const group = groups[index];
    if (group.items.length < 4)
      group.items.push({
        text: turn.text.slice(0, 220),
        speaker: turn.speaker,
        sourceIds: [turn.id],
      });
  }
  return {
    title: conversation.title,
    engine: 'transcript',
    branches: groups.filter((g) => g.items.length),
  };
}
export function validateAgentMap(raw, conversation, turns) {
  if (!raw || !Array.isArray(raw.branches)) return null;
  const ids = new Set(turns.map((t) => t.id));
  const branches = raw.branches
    .slice(0, 4)
    .map((branch) => ({
      label: String(branch.label || 'Ideas').slice(0, 60),
      items: (Array.isArray(branch.items) ? branch.items : [])
        .slice(0, 4)
        .filter(
          (item) =>
            typeof item.text === 'string' &&
            Array.isArray(item.sourceIds) &&
            item.sourceIds.length > 0 &&
            item.sourceIds.every((id) => ids.has(id)),
        )
        .map((item) => ({
          text: item.text.slice(0, 220),
          sourceIds: item.sourceIds.slice(0, 8),
        })),
    }))
    .filter((b) => b.items.length);
  return branches.length
    ? {title: conversation.title, engine: 'bee-agent', branches}
    : null;
}
