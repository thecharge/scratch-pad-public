export function withQuery(path: string, extra: Readonly<Record<string, string>>): string {
  const [base = "", existing = ""] = path.split("?");
  return `${base}?${new URLSearchParams({ ...Object.fromEntries(new URLSearchParams(existing)), ...extra })}`;
}

export async function everything(
  call: (method: string, path: string) => Promise<Response>,
  path: string,
): Promise<unknown[]> {
  const page = (await (await call("GET", withQuery(path, { pageSize: "1" }))).json()) as Record<
    string,
    unknown
  >;
  const key = Object.keys(page).find((name) => Array.isArray(page[name])) ?? "";
  const first = page[key] as unknown[];
  const token = String(page.nextPageToken);
  return token === "" ? first : [...first, ...(await rest(call, path, token))];
}

async function rest(
  call: (method: string, path: string) => Promise<Response>,
  path: string,
  token: string,
): Promise<unknown[]> {
  const page = (await (
    await call("GET", withQuery(path, { pageSize: "1", pageToken: token }))
  ).json()) as Record<string, unknown>;
  const key = Object.keys(page).find((name) => Array.isArray(page[name])) ?? "";
  const items = page[key] as unknown[];
  const next = String(page.nextPageToken);
  return next === "" ? items : [...items, ...(await rest(call, path, next))];
}

export async function loggedReads(
  call: (method: string, path: string) => Promise<Response>,
): Promise<number> {
  const text = await (await call("GET", "/v1/logs?capability=config.get&pageSize=1000")).text();
  return (text.match(/"requestId"/g) ?? []).length;
}
