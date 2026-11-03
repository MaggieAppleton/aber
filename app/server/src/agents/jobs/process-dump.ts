import { tool, type LanguageModel, type ModelMessage } from 'ai';
import { stat } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { config } from '../../config.js';
import { imageForModel } from '../image-input.js';
import { projectedModelOutput } from '../projection.js';
import { runAgent, BudgetExceededError } from '../run.js';
import { EvaluationBudgetExceededError } from '../spend-budget.js';
import { agentTools } from '../tools.js';
import { PROCESS_TOOLS, type AgentDatabase, type ToolLayer, type RunContext, type ProviderName } from '../types.js';
import { fetchArticle, type FetchedArticle } from '../fetch-article.js';
import { embedText } from '../adapters.js';
import { fakeProcessModel, normalWords } from '../fixtures.js';
import { promptFor } from '../prompts.js';
import { nearDuplicateDecision } from './near-duplicate.js';
import { readTool, compactTheory, compactSignal, signalCandidates, type Row } from './context.js';
import { processingDecisions, processingRefusal, type SignalDecisions } from './process-decisions.js';
import { normaliseUrl } from '../../tools/core.js';
import { choiceFor } from '../models.js';

export interface ProcessOptions extends RunContext { provider?: ProviderName; model?: LanguageModel; processingDecisionModel?: LanguageModel; articleFetcher?: (url: string) => Promise<FetchedArticle | null> }

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
  const decisions = processingDecisions(db, dump, themes, articles, options);
  const stop = new AbortController();
  let budgetFailure: BudgetExceededError | EvaluationBudgetExceededError | undefined;
  const decide = async <T>(task: () => Promise<T>): Promise<T> => {
    try { return await task(); }
    catch (error) {
      if (error instanceof BudgetExceededError || error instanceof EvaluationBudgetExceededError) {
        budgetFailure = error;
        // The AI SDK turns thrown tool errors into tool results. Abort the loop too.
        stop.abort(error);
      }
      throw error;
    }
  };
  const messageContent: Extract<ModelMessage, { role: 'user' }>['content'] = [{ type: 'text', text: JSON.stringify(input) }];
  if (process.env.AGENT_MODE !== 'fake') {
    for (const image of (dump.attachments ?? []).filter((item: Row) => item.kind === 'image').slice(0, 4)) {
      const directory = resolve(config.dataDir, 'media');
      const path = resolve(directory, image.path);
      if (!path.startsWith(`${directory}${sep}`)) throw new Error('Image path leaves the media directory');
      if ((await stat(path)).size > 20_000_000) throw new Error('Images above 20 MB need reducing before processing');
      messageContent.push({ type: 'file', data: await imageForModel(path, { signal: options.signal }), mediaType: 'image/jpeg' });
    }
  }
  const result = await runAgent(db, {
    job: 'process_dump', ...promptFor('process-dump'), maxSteps: 24, maxInputTokens: 99_000,
    provider: options.provider,
    ...(decisions.mode === 'on' && !options.model && process.env.AGENT_MODE !== 'fake'
      ? { modelConfig: choiceFor('link_evidence', options.provider) } : {}),
    ...(options.model ? { model: options.model } : process.env.AGENT_MODE === 'fake' ? { model: fakeProcessModel(dump, themes, candidates) } : {}),
    tools: runId => {
      const actor = { kind: 'agent' as const, job: 'process_dump', runId, dumpId };
      const tools = agentTools(layer, PROCESS_TOOLS, 'process_dump', runId, dumpId, { db, ctx: options });
      const safe = async (name: string, input: unknown) => {
        try { return await layer.call(name, input, actor); }
        catch (error) { return { error: { name: error instanceof Error ? error.name : 'Error', message: error instanceof Error ? error.message : String(error) } }; }
      };
      const filings = new Map<string, SignalDecisions>();
      tools.createSignal = tool({
        description: 'Create one distinct finding with its original source URLs and dump. A newly captured article can yield several findings sharing its URL. A URL saved before this capture attaches all its existing findings; tombstoned observations are refused.' + (decisions.mode === 'on' ? ' Source support and finding boundaries are verified before writing; only unresolved sub-decisions receive a bounded check. Existing-theme matches are filed automatically and returned in themes; do not call fileSignal again for those themes. On a validation error, repair only the named field or reply without saving it.' : ''),
        inputSchema: layer.schemas.createSignal,
        toModelOutput: projectedModelOutput,
        execute: async raw => {
          const value = raw as Row;
          // Repeated URLs attach existing findings rather than write the proposed gist.
          // Leave that identity/tombstone path entirely to the existing domain tools.
          const urls = (value.sources ?? []).filter((source: Row) => source.url).map((source: Row) => normaliseUrl(source.url));
          const repeats = (lookup.exactMatches ?? []).some((match: Row) => (match.sources ?? []).some((saved: Row) => saved.url && urls.includes(normaliseUrl(saved.url))));
          const tombstoned = (lookup.tombstones ?? []).some((item: Row) => item.gist?.toLowerCase() === value.gist.toLowerCase() || urls.includes(item.url_normalised ?? item.urlNormalised));
          const decision = repeats || tombstoned ? undefined : await decide(() => decisions.signal(value));
          if (decisions.mode === 'on' && decision?.rejection) return processingRefusal(decision.rejection);
          const fetched = articles.filter(item => item.article && value.sources?.some((source: Row) => source.url && (decisions.mode === 'on' ? normaliseUrl(source.url) === normaliseUrl(item.attachment.url) : source.url === item.attachment.url))).map(item => item.article);
          const vector = await embedText(db, `${value.gist}\n${value.note ?? ''}`.slice(0, 6500), options);
          let created = await safe('createSignal', { ...value, dumpId, ...(decisions.mode === 'on' ? { fetched: fetched.length ? fetched : undefined } : fetched.length ? { fetched } : {}), embedding: vector }) as Row;
          if (decisions.mode === 'on' && created?.id && decision && (created.createdBy ?? created.created_by) === `agent:process_dump:${runId}`) {
            filings.set(created.id, decision);
            const filingErrors: unknown[] = [];
            for (const [themeId, fit] of decision.themes) {
              if (fit !== true) continue;
              const filed = await safe('fileSignal', { signalId: created.id, themeId }) as Row;
              if (filed?.error) filingErrors.push({ themeId, ...filed });
              else created = filed;
            }
            if (filingErrors.length) return { ...created, filingErrors };
          }
          return created;
        },
      });
      if (decisions.mode !== 'off') {
        tools.fileSignal = tool({
          ...tools.fileSignal,
          execute: async raw => {
            const value = raw as Row;
            const filing = filings.get(value.signalId);
            if (decisions.mode === 'on' && filing?.enforceResolvedThemes && filing.themes.has(value.themeId) && filing.themes.get(value.themeId) === undefined) {
              return processingRefusal('The bounded theme check could not establish this filing. Leave it unfiled rather than repeating the decision in the processing agent.');
            }
            if (decisions.mode === 'on' && filing?.themes.get(value.themeId) === false) {
              return processingRefusal('This existing theme does not fit the source-backed finding. Use an appropriate theme, or leave it unfiled while repairing the gist.');
            }
            return safe('fileSignal', value);
          },
        });
        for (const [name, kind] of [['createDraftTheory', 'theory'], ['createDraftPrototype', 'prototype']] as const) {
          tools[name] = tool({
            description: (tools[name].description ?? '') + (decisions.mode === 'on' ? ` ${kind === 'theory' ? 'Requires a specific source-grounded falsifiable claim.' : 'Requires an explicit prototype request in the capture or a concrete useful experiment described by the source.'} A known failed gate returns a repairable validation error before creating anything.` : ''),
            inputSchema: layer.schemas[name],
            toModelOutput: tools[name].toModelOutput,
            execute: async raw => {
              const rejection = await decide(() => decisions.draft(kind, raw as Row));
              if (rejection) return processingRefusal(rejection);
              return safe(name, raw);
            },
          });
        }
      }
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
  }, { messages: [{ role: 'user', content: messageContent }] }, { ...options, dumpId, ...(decisions.mode !== 'off' ? { signal: options.signal ? AbortSignal.any([options.signal, stop.signal]) : stop.signal } : {}) }).catch(error => {
    throw budgetFailure ?? error;
  });
  if (budgetFailure) throw budgetFailure;
  return result;
}
