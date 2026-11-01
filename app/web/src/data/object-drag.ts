import type { DragEvent } from "react";
import { rowFor } from "./live";
export type DraggedObject = { kind: "theory" | "theme" | "prototype" | "signal"; id: string; label: string };
export const objectMime = "application/x-aber-object";
let active: DraggedObject | undefined;
export function beginObjectDrag(event: DragEvent, object: DraggedObject) {
  active = object;
  event.dataTransfer.effectAllowed = "copy";
  event.dataTransfer.setData(objectMime, JSON.stringify(object));
  event.dataTransfer.setData("text/plain", object.label);
  event.stopPropagation();
}
export const endObjectDrag = () => { active = undefined; };
export const currentObjectDrag = () => active;
export function readObjectDrag(transfer: DataTransfer): DraggedObject | undefined {
  try {
    const value = JSON.parse(transfer.getData(objectMime));
    if (!["theory", "theme", "prototype", "signal"].includes(value.kind) || typeof value.id !== "string" || typeof value.label !== "string" || !rowFor(value.kind, value.id)) return;
    return value;
  } catch { return undefined; }
}
