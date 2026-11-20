import { describe, expect, test } from "bun:test";
import { stubAuthApp } from "../../packages/recorder/src/stub-auth.ts";

async function createChallenge() {
  const verifier = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString("base64url");
  const challenge = new Bun.CryptoHasher("sha256").update(verifier).digest("base64url");
  return { verifier, challenge, state: "state-0" };
}

const REDIRECT = "http://console.test/";

function authorize(app: ReturnType<typeof stubAuthApp>, challenge: string, state: string) {
  const query = new URLSearchParams({
    response_type: "code",
    code_challenge: challenge,
    code_challenge_method: "S256",
    redirect_uri: REDIRECT,
    state,
  });
  return app.request(`/api/auth/mcp/authorize?${query}`);
}

function exchange(app: ReturnType<typeof stubAuthApp>, code: string, verifier: string) {
  return app.request("/api/auth/mcp/token", {
    method: "POST",
    body: new URLSearchParams({ code, code_verifier: verifier, grant_type: "authorization_code" }),
  });
}

async function codeFrom(response: Response): Promise<string> {
  return new URL(response.headers.get("location") ?? "").searchParams.get("code") ?? "";
}

describe("stub authorization server", () => {
  test("a correct verifier is exchanged for the token, once", async () => {
    const app = stubAuthApp("the-token");
    const pkce = await createChallenge();
    const code = await codeFrom(await authorize(app, pkce.challenge, pkce.state));
    const first = await exchange(app, code, pkce.verifier);
    const second = await exchange(app, code, pkce.verifier);
    expect([first.status, (await first.json()).access_token, second.status]).toEqual([
      200,
      "the-token",
      400,
    ]);
  });

  test("a wrong verifier is refused", async () => {
    const app = stubAuthApp("the-token");
    const pkce = await createChallenge();
    const code = await codeFrom(await authorize(app, pkce.challenge, pkce.state));
    expect((await exchange(app, code, "wrong")).status).toBe(400);
  });

  test("the state is echoed back to the redirect", async () => {
    const app = stubAuthApp("t");
    const response = await authorize(app, "c", "state-1");
    expect(new URL(response.headers.get("location") ?? "").searchParams.get("state")).toBe(
      "state-1",
    );
  });
});
