import { validateUIMessages, type UIMessage } from 'ai';
import { streamAgent } from './run.js';
import { agentTools } from './tools.js';
import { DISPLAY_TOOLS, READ_TOOLS, type AgentDatabase, type RunContext, type ToolLayer } from './types.js';
import { scriptedModel, type ScriptStep } from './scripted-model.js';
import { promptFor } from './prompts.js';
import { readTool, type Row } from './jobs/context.js';
import { jevMode } from './jev.js';
import { chatShortcutModel, resolveChatShortcut } from './chat-shortcuts.js';

export interface ChatBody {
  messages: UIMessage[];
  dumpId?: string;
  context?: { kind: string; id?: string; label: string }[];
  attachments?: Row[];
}

function fakeChatModel(text: string, context: NonNullable<ChatBody['context']>, themes: Row[], theories: Row[]) {
  const lower = text.toLowerCase();
  const theory = context.find(item => item.kind === 'theory')?.id
    ?? theories.find(item => lower.includes(item.id.toLowerCase()) || lower.includes(item.claim.toLowerCase()))?.id
    ?? (/memory|context across/.test(lower) ? theories.find(item => /context across/.test(item.claim.toLowerCase()))?.id : undefined);
  const themeId = context.find(item => item.kind === 'theme')?.id
    ?? themes.find(item => lower.includes(item.name.toLowerCase()))?.id;
  const steps: ScriptStep[] = [];
  if (/signals|observations|sources/.test(lower)) steps.push({ calls: [{ toolName: 'showSignalList', input: { ...(theory ? { theoryId: theory } : {}), ...(themeId ? { themeId } : {}), limit: 8 } }] });
  else if (themeId && /new|changed|activity|theme/.test(lower)) steps.push({ calls: [{ toolName: 'showThemeActivity', input: { themeId } }] });
  else if (theory) steps.push({ calls: [{ toolName: 'showTheory', input: { id: theory } }, { toolName: 'showEvidenceSplit', input: { id: theory } }] });
  else steps.push({ calls: [{ toolName: 'showSignalList', input: { ...(themeId ? { themeId } : {}), limit: 5 } }] });
  steps.push({ text: theory ? 'Here is the theory and its current evidence. The split includes pending proposals for you to assess.' : themeId ? 'Here is the latest material gathered in this theme.' : 'Here are the recent signals. Open a theory or theme to explore a particular connection.' });
  return scriptedModel(steps);
}

/** Capture always completes before the first model request. Existing voice dumps are reused. */
export async function createChatResponse(db: AgentDatabase, tools: ToolLayer, rawBody: unknown, ctx: RunContext = {}): Promise<Response> {
  if (!rawBody || typeof rawBody !== 'object') throw new Error('Chat body must be an object');
  const body = rawBody as ChatBody;
  if (!Array.isArray(body.messages) || !body.messages.length || body.messages.length > 100) throw new Error('Chat needs between 1 and 100 messages');
  await validateUIMessages({ messages: body.messages });
  const latest = [...body.messages].reverse().find(message => message.role === 'user');
  if (!latest) throw new Error('Chat needs a user message');
  const text = latest.parts.filter(part => part.type === 'text').map(part => part.text).join('\n');
  const context = (body.context ?? []).map(item => ({ kind: item.kind, id: item.id ?? item.kind, label: item.label }));
  let dumpId = body.dumpId;
  if (!dumpId) {
    const urls = [...new Set(text.match(/https?:\/\/[^\s<>]+/g) ?? [])].map(value => value.replace(/[),.;!?]+$/, ''));
    const captured = await tools.call('captureDump', { text, urls, context, attachments: body.attachments ?? [], from: 'column' }, { kind: 'person', id: 'maggie' }) as { id: string };
    dumpId = captured.id;
  }
  const dump = await readTool<Row | null>(tools, 'getDump', { id: dumpId }, 'chat');
  if (!dump || dump.deleted_at || dump.deletedAt) throw new Error('Chat dump not found');
  const activeContext = body.context === undefined ? dump.context ?? [] : context;
  const [themes, theories] = await Promise.all([
    readTool<Row[]>(tools, 'listThemes', {}, 'chat'),
    readTool<Row[]>(tools, 'listTheories', {}, 'chat'),
  ]);
  const prompt = promptFor('chat');
  const mode = jevMode('chat');
  const decision = mode === 'off' ? null : await resolveChatShortcut(db, { messages: body.messages, context: activeContext, themes, theories, dumpId }, ctx);
  const shortcut = mode === 'on' ? decision : null;
  const response = await streamAgent(db, {
    job: 'chat', ...prompt,
    system: `${prompt.system}\n\nOpen context: ${JSON.stringify(activeContext)}\nCaptured dump: ${dumpId}`,
    maxSteps: 7, maxInputTokens: 99_000,
    ...(shortcut ? { model: chatShortcutModel(shortcut) } : process.env.AGENT_MODE === 'fake' ? { model: fakeChatModel(text, activeContext, themes, theories) } : {}),
    tools: runId => agentTools(tools, [...READ_TOOLS, ...DISPLAY_TOOLS], 'chat', runId, dumpId, { db }),
  }, { messages: body.messages }, {
    ...ctx, dumpId,
    onReply: async (parts, runId) => { await tools.call('reply', { dumpId, parts }, { kind: 'agent', job: 'chat', runId, dumpId }); },
  });
  response.headers.set('X-Aber-Dump-Id', dumpId);
  return response;
}
