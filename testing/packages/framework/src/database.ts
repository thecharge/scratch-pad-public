import { PathSegment } from "@platform/constants";

export function isolatedDatabasePath(): string {
  return PathSegment.InMemoryDatabase;
}
