import { ConsoleResource, ConsoleView, LIVE_MODE_AUTO, MessageId } from "@platform/constants";
import { message } from "@platform/messages";
import type { ConsoleProps } from "@platform/types";
import { Refine } from "@refinedev/core";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createAuthProvider } from "./auth-provider.ts";
import { hasAdminScope } from "./claims.ts";
import { consoleConfig } from "./config.ts";
import { createDataProvider } from "./data-provider.ts";
import { createLiveProvider } from "./live-provider.ts";
import { LiveView } from "./live-view.tsx";
import { LogsView } from "./logs-view.tsx";
import { StatsView } from "./stats-view.tsx";

const RESOURCES = [{ name: ConsoleResource.Logs }, { name: ConsoleResource.Stats }];

export function App({ tokens }: ConsoleProps) {
  const config = consoleConfig();
  const [view, setView] = useState<ConsoleView>(ConsoleView.Live);
  const authProvider = createAuthProvider(config, tokens);
  if (!hasAdminScope(tokens.get())) {
    return (
      <Card>
        <CardContent>
          <p>{message(MessageId.UiNoAdmin)}</p>
          <Button onClick={() => authProvider.login({})}>{message(MessageId.UiSignIn)}</Button>
        </CardContent>
      </Card>
    );
  }
  return (
    <Refine
      dataProvider={createDataProvider(config, tokens)}
      liveProvider={createLiveProvider(config, tokens)}
      authProvider={authProvider}
      resources={RESOURCES}
      options={{ liveMode: LIVE_MODE_AUTO, disableTelemetry: true }}
    >
      <h1 className="text-xl font-semibold">{message(MessageId.UiConsoleTitle)}</h1>
      <nav className="flex gap-2">
        <Button onClick={() => setView(ConsoleView.Live)}>{message(MessageId.UiNavLive)}</Button>
        <Button onClick={() => setView(ConsoleView.Logs)}>{message(MessageId.UiNavLogs)}</Button>
        <Button onClick={() => setView(ConsoleView.Stats)}>{message(MessageId.UiNavStats)}</Button>
        <Button onClick={() => authProvider.logout({})}>{message(MessageId.UiSignOut)}</Button>
      </nav>
      {view === ConsoleView.Live ? <LiveView /> : null}
      {view === ConsoleView.Logs ? <LogsView /> : null}
      {view === ConsoleView.Stats ? <StatsView /> : null}
    </Refine>
  );
}
