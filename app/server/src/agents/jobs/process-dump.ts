import { tool, type LanguageModel, type ModelMessage } from 'ai';
import { stat } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { config } from '../../config.js';
import { imageForModel } from '../image-input.js';
import { projectedModelOutput } from '../projection.js';
import { runAgent } from '../run.js';
import { agentTools } from '../tools.js';
import { PROCESS_TOOLS, type AgentDatabase, type ToolLayer, type RunContext, type ProviderName } from '../types.js';
import { fetchArticle, type FetchedArticle } from '../fetch-article.js';
import { embedText } from '../adapters.js';
import { fakeProcessModel, normalWords } from '../fixtures.js';
import { promptFor } from '../prompts.js';
import { nearDuplicateDecision } from './near-duplicate.js';
import { readTool, compactTheory, compactSignal, signalCandidates, type Row } from './context.js';

export interface ProcessOptions extends RunContext { provider?: ProviderName; model?: LanguageModel; articleFetcher?: (url: string) => Promise<FetchedArticle | null> }

export async function processDump(db: AgentDatabase, layer: ToolLayer, dumpId: string, options: ProcessOptions = {}) {
  const [dump, themes, theories] = await Promise.all([
    readTool<Row | null>(layer, 'getDump', { id: dumpId }, 'process_dump'),
    readTool<Row[]>(layer, 'listThemes', {}, 'process_dump'),
    readTool<Row[]>(layer, 'listTheories', {}, 'process_dump'),
  ]);
  if (!dump) throw new Error('Dump not found');
  if (dump.deletedAt ?? dump.deleted_at) return;
  const links: Row[] = (dump.attachments ?? []).filter((item: Row) => item.kind === 'link' && item.url);
  const articles = await Promise.all(links.map(async attachment => ({ attachment, article: process.env.AGENT_MODE === 'fake' && !options.articleFetcher ? null : await (options.articleFetcher ?? fetchArticle)(attachment.url) })));
  const text = [dump.text, ...(dump.transcripts ?? []).map((item: Row) => item.text)].join('\n');
  const embedding = await embedText(db, text.slice(0, 6500), options);
  const similar = await readTool<unknown>(layer, 'similarSignals', { text, urls: links.map(item => item.url), embedding, limit: 8 }, 'process_dump');
  const candidates = signalCandidates(similar);
  const lookup = await readTool(layer, 'lookupSignals', { urls: links.map(item => item.url) }, 'process_dump');
  const input = {
    dump: { id: dump.id, text: dump.text, transcripts: dump.transcripts, context: dump.context, isAsk: dump.isAsk ?? dump.is_ask, attachments: (dump.attachments ?? []).map((attachment: Row) => ({ ...attachment, fetched: articles.find(item => item.attachment.id === attachment.id)?.article ?? null })) },
    themes: themes.map(theme => ({ id: theme.id, name: theme.name, status: theme.status })),
    theories: theories.map(compactTheory),
    similar: Array.isArray(similar) ? similar.map(compactSignal) : similar,
    exactMatchesAndTombstones: { exactMatches: (lookup.exactMatches ?? []).map(compactSignal), tombstones: (lookup.tombstones ?? []).map((item: Row) => ({ gist: item.gist, url: item.url_normalised })) },
  };
  const messageContent: Extract<ModelMessage, { role: 'user' }>['content'] = [{ type: 'text', text: JSON.stringify(input) }];
  if (process.env.AGENT_MODE !== 'fake') {
    for (const image of (dump.attachments ?? []).filter((item: Row) => item.kind === 'image').slice(0, 4)) {
      const directory = resolve(config.dataDir, 'media');
      const path = resolve(directory, image.path);
      if (!path.startsWith(`${directory}${sep}`)) throw new Error('Image path leaves the media directory');
      if ((await stat(path)).size > 20_000_000) throw new Error('Images above 20 MB need reducing before processing');
      messageContent.push({ type: 'file', data: await imageForModel(path), mediaType: 'image/jpeg' });
    }
  }
  const result = await runAgent(db, {
    job: 'process_dump', ...promptFor('process-dump'), maxSteps: 24, maxInputTokens: 99_000,
    provider: options.provider,
    ...(options.model ? { model: options.model } : process.env.AGENT_MODE === 'fake' ? { model: fakeProcessModel(dump, themes, candidates) } : {}),
    tools: runId => {
      const actor = { kind: 'agent' as const, job: 'process_dump', runId, dumpId };
      const tools = agentTools(layer, PROCESS_TOOLS, 'process_dump', runId, dumpId, { db, ctx: options });
      const safe = async (name: string, input: unknown) => {
        try { return await layer.call(name, input, actor); }
        catch (error) { return { error: { name: error instanceof Error ? error.name : 'Error', message: error instanceof Error ? error.message : String(error) } }; }
      };
      tools.createSignal = tool({
        description: 'Create one distinct observation with its original source URLs and dump. Repeat URLs attach their origin; tombstoned observations are refused.',
        inputSchema: layer.schemas.createSignal,
        toModelOutput: projectedModelOutput,
        execute: async raw => {
          const value = raw as Row;
          const fetched = articles.filter(item => item.article && value.sources?.some((source: Row) => source.url === item.attachment.url)).map(item => item.article);
          const vector = await embedText(db, `${value.gist}\n${value.note ?? ''}`.slice(0, 6500), options);
          return safe('createSignal', { ...value, dumpId, ...(fetched.length ? { fetched } : {}), embedding: vector });
        },
      });
      tools.mergeNearDuplicateSignals = tool({
        description: 'Request an automatic merge of the very same event or finding. A separate comparison model must approve it; a shared topic is insufficient.',
        inputSchema: layer.schemas.mergeNearDuplicateSignals,
        toModelOutput: projectedModelOutput,
        execute: async raw => {
          const value = raw as Row;
          const [survivor, absorbed] = await Promise.all([
            layer.call('getSignal', { id: value.survivorId }, actor) as Promise<Row>,
            layer.call('getSignal', { id: value.absorbedId }, actor) as Promise<Row>,
          ]);
          if (!survivor || !absorbed) return { merged: false, reasoning: 'One of the observations no longer exists.' };
          const decision = await nearDuplicateDecision(db, compactSignal(survivor), compactSignal(absorbed), options, options.provider, normalWords(survivor.gist) === normalWords(absorbed.gist));
          if (!decision.sameFinding) return { merged: false, reasoning: decision.reasoning };
          return safe('mergeNearDuplicateSignals', { ...value, dumpId, reasoning: decision.reasoning });
        },
      });
      return tools;
    },
  }, { messages: [{ role: 'user', content: messageContent }] }, { ...options, dumpId });
  return result;
}
