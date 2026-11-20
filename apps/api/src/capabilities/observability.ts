import { paginate, requireResourceName } from "@platform/aip";
import { defineCapability } from "@platform/capability";
import {
  API_EVENT_NAME,
  AuthMode,
  MAX_LOG_LIMIT,
  MessageId,
  MethodKind,
  StatsCapabilityId,
  StatsPattern,
} from "@platform/constants";
import { iterate } from "@platform/streams";
import {
  type ApiDeps,
  ApiEventSchema,
  EventListSchema,
  LogListInputSchema,
  LogListSchema,
  StatsSnapshotSchema,
} from "@platform/types";
import { z } from "zod";
import { ADMIN_POLICY, describe } from "./support.ts";

const StatsInputSchema = z.strictObject({ name: z.string() });

export async function getStats(deps: ApiDeps) {
  return defineCapability({
    ...(await describe(
      StatsCapabilityId.Get,
      MethodKind.Get,
      StatsPattern.Stats,
      MessageId.SummaryStatsGet,
    )),
    auth: AuthMode.Required,
    input: StatsInputSchema,
    output: StatsSnapshotSchema,
    policy: ADMIN_POLICY,
    handler: async ({ name }) => {
      await requireResourceName(StatsPattern.Stats, name);
      return deps.observability.stats();
    },
  });
}

export async function getEvents(deps: ApiDeps) {
  return defineCapability({
    ...(await describe(
      StatsCapabilityId.EventsGet,
      MethodKind.Get,
      StatsPattern.Events,
      MessageId.SummaryEventsGet,
    )),
    auth: AuthMode.Required,
    input: StatsInputSchema,
    output: EventListSchema,
    policy: ADMIN_POLICY,
    events: {
      name: API_EVENT_NAME,
      item: ApiEventSchema,
      source: async () => iterate(await deps.observability.stream()),
    },
    handler: async ({ name }) => {
      await requireResourceName(StatsPattern.Events, name);
      return { events: await deps.observability.recent({}) };
    },
  });
}

export async function listLogs(deps: ApiDeps) {
  return defineCapability({
    ...(await describe(
      StatsCapabilityId.LogsList,
      MethodKind.List,
      StatsPattern.Logs,
      MessageId.SummaryLogsList,
    )),
    auth: AuthMode.Required,
    input: LogListInputSchema,
    output: LogListSchema,
    policy: ADMIN_POLICY,
    handler: async (input) => {
      const chronological = await deps.observability.recent({
        kind: input.kind,
        capability: input.capability,
        limit: MAX_LOG_LIMIT,
      });
      const page = await paginate(
        chronological.toReversed(),
        {
          pageSize: input.pageSize,
          pageToken: input.pageToken,
          query: [input.kind, input.capability],
        },
        deps.codec,
        deps.limits,
      );
      return { events: page.items, nextPageToken: page.nextPageToken };
    },
  });
}
