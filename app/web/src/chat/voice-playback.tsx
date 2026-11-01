import { useRef, useState } from "react";
import { NoteWave, useAudioWaveform } from "./audio-waveform";
import { Icon } from "../ui/atoms";
import { reportError } from "../data/live";
import type { Att } from "../ui/pill-study";

const time = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
export function VoicePlayback({ atts, seconds }: { atts: Att[]; seconds: number }) {
  const root = useRef<HTMLDivElement>(null), audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false), [at, setAt] = useState(0), [metadataDuration, setDuration] = useState(seconds);
  const source = atts.find(attachment => attachment.kind === "audio")?.url;
  const { waveform, error } = useAudioWaveform(source, root);
  const duration = waveform?.duration ?? metadataDuration;
  return <div ref={root} className="ab-recorded-note">
    <div className="ps-bubble ps-voice" aria-busy={!!source && !waveform && !error}>
      <audio ref={audio} src={source} preload="metadata" onTimeUpdate={() => setAt(audio.current?.currentTime ?? 0)}
        onLoadedMetadata={() => { const duration = audio.current?.duration; if (duration && Number.isFinite(duration)) setDuration(duration); }}
        onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} />
      <button type="button" className="ps-ib" disabled={!source} aria-label={playing ? "Pause voice note" : "Play voice note"} title={playing ? "Pause" : "Play"}
        onClick={() => { if (playing) audio.current?.pause(); else void audio.current?.play().catch(reportError); }}>
        <Icon name={playing ? "pause" : "play"} size={14} />
      </button>
      <NoteWave bars={30} height={16} peaks={waveform?.peaks} at={duration ? at / duration : 0}
        onSeek={duration > 0 ? fraction => { if (audio.current) audio.current.currentTime = fraction * duration; } : undefined} />
      <span className="ap-num ap-muted">{time(Number.isFinite(duration) ? duration : seconds)}</span>
    </div>
    {error && <span className="ap-muted ab-wave-error">{error}</span>}
  </div>;
}
