import type { ModelMessage } from 'ai';
type Row = Record<string, unknown>;
export function editableDraftRelationships(row: Row): boolean {
  if (typeof row.editableDraftRelationships === 'boolean') return row.editableDraftRelationships;
  const createdBy = row.createdBy ?? row.created_by;
  const updatedBy = row.updatedBy ?? row.updated_by ?? createdBy;
  return row.status === 'draft' && typeof createdBy === 'string' && createdBy.startsWith('agent:') && typeof updatedBy === 'string' && updatedBy.startsWith('agent:');
}

const fields = new Set(['id','kind','name','gist','note','claim','body','status','draft','authorship','horizon','tripwire','tripwireVersion','themeId','theoryId','signalId','dumpId','survivorId','absorbedId','mergedIntoId','discardedAt','deletedAt','count','counts','context','isAsk','text','attachments','transcripts','sources','origins','themes','evidence','follows','rivals','supports','undermines','pending','reasoning','reason','why','stance','payload','suggestions','similarity','exactMatch','exactMatches','tombstones','signals','theories','theme','theory','url','urlNormalised','author','publishedAt','title','ownObservation','mediaId','mime','path','position','error','message','merged','sameFinding','parts','type','data','themeName','since']);
fields.add('confidence'); fields.add('currentConfidence'); fields.add('tripwireState');
fields.add('editableDraftRelationships'); fields.add('protectedByPerson');

/** Model context is a projection; UI tool outputs and durable traces keep full rows. */
export function modelProjection(value: unknown, toolName?: string): unknown {
  if (Array.isArray(value)) return value.slice(0, 100).map(item => modelProjection(item));
  if (!value || typeof value !== 'object') return value;
  if (value instanceof Uint8Array) return undefined;
  const row = value as Row;
  const output: Row = {};
  if (typeof row.claim === 'string' && typeof row.status === 'string') output.editableDraftRelationships = editableDraftRelationships(row);
  if ((row.signalId ?? row.signal_id) && (row.theoryId ?? row.theory_id) && row.stance) {
    output.protectedByPerson = [row.createdBy ?? row.created_by, row.updatedBy ?? row.updated_by].some(actor => typeof actor === 'string' && actor.startsWith('person:'));
  }
  for (const [rawKey, item] of Object.entries(row)) {
    const key = rawKey.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
    if (rawKey.includes('_') && key in row) continue;
    if (key === 'fetched' || key === 'fetchedJson') continue; // Full source text is already in each job's initial input.
    if (!fields.has(key)) continue;
    if (toolName === 'getDump' && ['signals','theories','evidence','suggestions'].includes(key)) continue;
    output[key] = modelProjection(item);
  }
  return output;
}

export const projectedModelOutput = ({ output }: { output: unknown }) => ({ type: 'json' as const, value: modelProjection(output) as any });

/** prepareStep receives raw tool results before the provider conversion hook. */
export function projectToolMessages(messages: ModelMessage[]): ModelMessage[] {
  return messages.map(message => {
    if (message.role !== 'tool') return message;
    return { ...message, content: message.content.map(part => {
      if (part.type !== 'tool-result' || part.output.type !== 'json') return part;
      return { ...part, output: { ...part.output, value: modelProjection(part.output.value, part.toolName) as any } };
    }) };
  });
}
