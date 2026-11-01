export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

export async function request<T = any>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, options);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(body.error?.message ?? body.error ?? body.message ?? `Request failed (${response.status})`, response.status);
  return body;
}

export const callTool = <T = any>(name: string, input: Record<string, unknown>) => request<T>(`/api/tools/${name}`, {
  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input),
});

export function capture(input: { text?: string; urls?: string[]; context?: unknown[]; files?: File[]; capturedFrom?: string }) {
  if (input.files?.length) {
    const form = new FormData();
    form.set("text", input.text ?? "");
    form.set("from", input.capturedFrom ?? "column");
    form.set("context", JSON.stringify(input.context ?? []));
    form.set("urls", JSON.stringify(input.urls ?? []));
    input.files.forEach(file => form.append("files", file));
    return request("/api/dumps", { method: "POST", body: form });
  }
  return request("/api/dumps", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({text:input.text,urls:input.urls,context:input.context,from:input.capturedFrom??"column"}) });
}

export function uploadMedia(file: File) {
  const form=new FormData();form.set("file",file);
  return request("/api/media",{method:"POST",body:form});
}
