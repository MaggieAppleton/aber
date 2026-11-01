import { Enter } from "../parts";
import appShot from "../assets/app-current.png";

export const notes = `Aber is a tool I've been building for myself to think about where technology is heading. The name is Welsh: an aber is where rivers converge, which is what this does with everything I notice. I'll spend a few minutes on the problem and the approach, then show you the real thing.`;

export default function TitleSlide() {
  return (
    <div className="dk-slide dk-title">
      <div className="dk-copy">
        <Enter><h1 className="dk-headline">Aber</h1></Enter>
        <Enter delay={0.08}><p className="dk-byline">“Aber” is Welsh for the convergence of rivers.</p></Enter>
        <Enter delay={0.16}><p className="dk-support">Somewhere to turn what I notice about technology into claims I can be wrong about.</p></Enter>
        <Enter delay={0.36}><p className="dk-byline">Maggie Appleton</p></Enter>
      </div>
      <Enter delay={0.3} y={20} className="dk-window">
        <img src={appShot} alt="Aber, with the theme index, theme sections and a theory open" />
      </Enter>
    </div>
  );
}
