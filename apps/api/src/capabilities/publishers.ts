import { requireResourceName, softDelete } from "@platform/aip";
import { defineCapability } from "@platform/capability";
import {
  AuthMode,
  CanonicalCode,
  ConformanceCapabilityId,
  DomainPattern,
  ErrorReason,
  MessageId,
  MethodKind,
  SOFT_DELETE_RETENTION_MS,
} from "@platform/constants";
import { ApiError } from "@platform/errors";
import {
  type ApiDeps,
  BookSchema,
  DeletePublisherInputSchema,
  PublisherDeletedSchema,
} from "@platform/types";
import { all } from "@platform/util";
import { describe, notFound, stamp, WRITE_POLICY } from "./support.ts";

export async function deletePublisher(deps: ApiDeps) {
  return defineCapability({
    ...(await describe(
      ConformanceCapabilityId.PublishersDelete,
      MethodKind.Delete,
      DomainPattern.Publisher,
      MessageId.SummaryPublisherDelete,
    )),
    auth: AuthMode.Required,
    input: DeletePublisherInputSchema,
    output: PublisherDeletedSchema,
    policy: WRITE_POLICY,
    handler: async ({ name, force }) => {
      await requireResourceName(DomainPattern.Publisher, name);
      const live = (await deps.books.list(name)).filter((book) => book.deleteTime === undefined);
      if (live.length === 0) {
        throw await notFound(name);
      }
      if (force !== true) {
        throw new ApiError(
          CanonicalCode.FailedPrecondition,
          ErrorReason.HasChildren,
          MessageId.PublisherHasChildren,
          { name, count: live.length },
        );
      }
      const now = await deps.now();
      await all(
        live.map(
          (book) => async () =>
            deps.books.save(
              await stamp(
                BookSchema.parse(await softDelete(book, now, SOFT_DELETE_RETENTION_MS)),
                now,
              ),
            ),
        ),
      );
      return { name, deletedBooks: live.length };
    },
  });
}
