/** Additive, fictional fixture pack. Nothing here represents Maggie's observations or beliefs. */
export const DEMO_IDS = {
  manifest: 'demo-v1:manifest', run: 'demo-v1:run', theme: 'demo-v1:robotics',
  theory: 'demo-v1:recovery-theory', prototype: 'demo-v1:recovery-prototype',
  voiceDump: 'demo-v1:voice-dump', reportDump: 'demo-v1:report-dump', independentDump: 'demo-v1:independent-dump',
  signal: 'demo-v1:recovery-signal', copy: 'demo-v1:recovery-copy', decoy: 'demo-v1:latency-decoy',
  revision: 'demo-v1:revision', merge: 'demo-v1:merge', media: 'demo-v1:voice-media',
} as const;
export const DEMO_VOICE = {
  filename: 'demo-v1-voice.wav', mime: 'audio/wav', bytes: 1147188, sampleRate: 16000, channels: 1,
  durationSeconds: 35.847188,
  sha256: '862284769d4d1ff802e738a1b672260c4c1dae2ebbde9e336558d060b96d5046',
  transcriptSha256: '6b610cb9723e479289f786119955290b6323fbf98b92c71977167db2b2cd6fc6',
  provenance: 'Authored synthetic narration, generated offline with macOS say at 180 words/minute and converted with ffmpeg to PCM s16le mono 16 kHz. No personal voice or transcription provider was used.',
} as const;
export const DEMO_MANIFEST = {
  version: 'demo-v1', id: DEMO_IDS.manifest, ids: DEMO_IDS, voice: DEMO_VOICE,
  provenance: 'Optional authored synthetic demo. Organisations, measurements, incidents and proposals are fictional. All added themes, theories and prototypes are agent-owned drafts. No new person stances or held beliefs. No pending agent jobs or network requests.',
  canonicalBaseline: { themes: 7, theories: 10, signals: 13, dumps: 5, prototypes: 4 },
} as const;
export interface DemoInstallation { pack: typeof DEMO_MANIFEST; baselineSha256: string; createdAt: string }
export const DEMO_MANIFEST_FILENAME = 'demo-manifest.json';
