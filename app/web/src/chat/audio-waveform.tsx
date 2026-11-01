import { useEffect, useMemo, useRef, useState, type RefObject } from "react";

export function audioPeaks(channels: Float32Array[], bars: number): number[] {
  const frames = channels[0]?.length ?? 0;
  return Array.from({ length: bars }, (_, bar) => {
    const first = Math.floor(bar * frames / bars), last = Math.floor((bar + 1) * frames / bars);
    let peak = 0;
    for (const channel of channels) for (let frame = first; frame < last; frame++) peak = Math.max(peak, Math.abs(channel[frame] ?? 0));
    return Math.min(1, peak);
  });
}
type Waveform = { peaks: number[]; duration: number };
const cache = new Map<string, Promise<Waveform>>();
function readWaveform(source: string): Promise<Waveform> {
  let pending = cache.get(source);
  if (!pending) {
    pending = (async () => {
      const response = await fetch(source);
      if (!response.ok) throw new Error("Couldn’t load the recording’s waveform");
      const decoder = new OfflineAudioContext(1, 1, 44100);
      const buffer = await decoder.decodeAudioData(await response.arrayBuffer());
      const channels = Array.from({ length: buffer.numberOfChannels }, (_, channel) => buffer.getChannelData(channel));
      return { peaks: audioPeaks(channels, 256), duration: buffer.duration };
    })();
    cache.set(source, pending);
    if (cache.size > 50) cache.delete(cache.keys().next().value!);
    void pending.catch(() => cache.delete(source));
  }
  return pending;
}
export function useAudioWaveform(source: string | undefined, element: RefObject<HTMLElement | null>) {
  const [visible, setVisible] = useState(false);
  const [waveform, setWaveform] = useState<Waveform>();
  const [error, setError] = useState("");
  useEffect(() => {
    if (!element.current) return;
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { setVisible(true); observer.disconnect(); }
    });
    observer.observe(element.current);
    return () => observer.disconnect();
  }, [element]);
  useEffect(() => {
    if (!source || !visible) return;
    let cancelled = false;
    setError(""); setWaveform(undefined);
    void readWaveform(source).then(result => { if (!cancelled) setWaveform(result); }, () => { if (!cancelled) setError("Waveform unavailable"); });
    return () => { cancelled = true; };
  }, [source, visible]);
  return { waveform, error };
}

export function NoteWave({ bars = 48, height = 22, at = 0, onSeek, peaks: samples }: {
  bars?: number; height?: number; at?: number; onSeek?: (fraction: number) => void; peaks?: readonly number[];
}) {
  const peaks = useMemo(() => Array.from({ length: bars }, (_, bar) => {
    if (!samples?.length) return 0;
    const start = Math.floor(bar * samples.length / bars), end = Math.max(start + 1, Math.floor((bar + 1) * samples.length / bars));
    return Math.max(...samples.slice(start, end));
  }), [samples, bars]);
  const ref = useRef<HTMLSpanElement>(null);
  const seek = (event: React.PointerEvent) => {
    const bounds = ref.current!.getBoundingClientRect();
    onSeek?.(Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width)));
  };
  return <span ref={ref} className="ps-note-wave" style={{ height }} data-scrub={onSeek ? "" : undefined}
    role={onSeek ? "slider" : undefined} tabIndex={onSeek ? 0 : undefined} aria-label={onSeek ? "Recording position" : undefined}
    aria-valuemin={onSeek ? 0 : undefined} aria-valuemax={onSeek ? 100 : undefined} aria-valuenow={onSeek ? Math.round(at * 100) : undefined}
    onKeyDown={event => {
      if (!onSeek || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      event.preventDefault(); onSeek(event.key === "Home" ? 0 : event.key === "End" ? 1 : Math.min(1, Math.max(0, at + (event.key === "ArrowRight" ? .05 : -.05))));
    }}
    onPointerDown={onSeek ? event => { event.currentTarget.setPointerCapture(event.pointerId); seek(event); } : undefined}
    onPointerMove={onSeek ? event => { if (event.buttons) seek(event); } : undefined}>
    {peaks.map((value, index) => <i key={index} data-on={index / bars < at ? "" : undefined} style={{ height: Math.max(3, value * height) }} />)}
    {onSeek && <b className="ps-note-head" style={{ left: `${at * 100}%` }} />}
  </span>;
}
