import type { ReactNode } from "react";

type Shape = { key: string; name: string; centre: string; note: string; sketch: ReactNode };

const B = ({ w, h, k, children }: { w?: string; h?: string; k?: string; children?: ReactNode }) =>
  <div className={`sk${k ? ` sk-${k}` : ""}`} style={{ width: w, height: h }}>{children}</div>;
const Col = ({ children, w, gap }: { children: ReactNode; w?: string; gap?: number }) =>
  <div className="sk-col" style={{ width: w, gap }}>{children}</div>;
const Row = ({ children, gap }: { children: ReactNode; gap?: number }) => <div className="sk-row" style={{ gap }}>{children}</div>;

const lines = (n: number, k = "line") => Array.from({ length: n }, (_, i) => <B key={i} k={k} />);

export const SHAPES: Shape[] = [
  {
    key: "columns", name: "Columns", centre: "Centre: provenance",
    note: "Five columns from raw to refined: Dumps, Signals, Themes, Theories, Prototypes. Selecting anything highlights what it connects to in every other column.",
    sketch: <Row gap={3}>{[4, 8, 5, 4, 2].map((n, i) => <Col key={i} w="20%" gap={2}>{lines(n, i === 3 ? "card" : "line")}</Col>)}</Row>,
  },
  {
    key: "wall", name: "Theory wall", centre: "Centre: what you believe",
    note: "The base plane is every held theory at once (they fit). Themes become groupings or a filter. Signals and dumps appear only inside a theory or a theme.",
    sketch: <div className="sk-grid">{Array.from({ length: 12 }, (_, i) => <B key={i} k={i === 4 || i === 9 ? "draft" : "card"} />)}</div>,
  },
  {
    key: "split", name: "Seen and claimed", centre: "Centre: the seen and claimed divide",
    note: "Two planes side by side: a time stream of signals on the left, your theories on the right. Dragging across the divide makes evidence.",
    sketch: <Row gap={6}><Col w="40%" gap={2}>{lines(9)}</Col><div className="sk-divide" /><Col w="55%" gap={3}>{lines(4, "card")}</Col></Row>,
  },
  {
    key: "index", name: "Index and focus", centre: "Centre: themes",
    note: "A theme index on the left, the theme's theories and signals in the middle, detail on the right. Familiar from Mail and Notes, and closest to the current boards.",
    sketch: <Row gap={4}><Col w="22%" gap={2}>{lines(8)}</Col><Col w="38%" gap={3}>{lines(2, "card")}{lines(3)}</Col><Col w="40%" gap={2}><B k="card" h="56px" />{lines(2)}</Col></Row>,
  },
  {
    key: "document", name: "Living document", centre: "Centre: your writing",
    note: "One long document of your current theories, in sections by theme. Signals sit in the margin beside the paragraph they support, and drafts appear as tracked changes.",
    sketch: <Row gap={6}><Col w="64%" gap={3}><B k="head" />{lines(4, "text")}<B k="head" />{lines(3, "text")}</Col><Col w="30%" gap={10}><B k="note" /><B k="note" /><B k="draft" h="14px" /></Col></Row>,
  },
  {
    key: "briefing", name: "Daily briefing", centre: "Centre: what changed",
    note: "Opens on what moved since you last looked: new signals by theme, challenges, drafts. Every item opens into its object. Stocks are reached through search.",
    sketch: <Col gap={4}><B k="head" w="40%" />{[3, 2, 2].map((n, i) => <Row key={i} gap={3}><B k="dot" />{<Col w="90%" gap={2}>{lines(n)}</Col>}</Row>)}</Col>,
  },
];
