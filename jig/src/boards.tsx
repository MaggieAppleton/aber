import { useEffect, useState } from "react";
import { JigPage } from "./jig";

type Board = { file: string; title: string };

export function BoardsJig() {
  const [boards, setBoards] = useState<Board[]>([]);
  useEffect(() => { fetch("/space-and-motion/manifest.json").then(r => r.json()).then(setBoards); }, []);
  return (
    <JigPage status={<>Reference only: the first space and motion boards. Superseded by <a href="/app">/app</a>.</>} title="Space and motion boards" intro="Wireframes exported from the Claude Design canvas. Click one to open the live board.">
      <div className="jig-boards">
        {boards.map(b => {
          const name = b.file.replace(".html", "");
          return (
            <a key={b.file} className="jig-board" href={`/space-and-motion/boards/${b.file}`} target="_blank">
              <img src={`/space-and-motion/screenshots/${name}.png`} alt="" loading="lazy" />
              <strong>{b.title.replace(/\s·\s/g, ": ")}</strong>
            </a>
          );
        })}
      </div>
    </JigPage>
  );
}
