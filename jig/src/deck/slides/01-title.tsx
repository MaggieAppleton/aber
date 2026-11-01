import { Enter } from "../parts";

export const notes = `Aber is a tool I've been building for myself to think about where technology is heading. The name is German for "but", which is roughly the word I want to hear more often about my own predictions. I'll spend a few minutes on the problem and the approach, then show you the real thing.`;

export default function TitleSlide() {
  return (
    <div className="dk-slide dk-title">
      <div className="dk-copy">
        <Enter><h1 className="dk-headline">Aber</h1></Enter>
        <Enter delay={0.12}><p className="dk-support">Somewhere to turn what I notice about technology into claims I can be wrong about.</p></Enter>
        <Enter delay={0.24}><p className="dk-byline">Maggie Appleton</p></Enter>
      </div>
    </div>
  );
}
