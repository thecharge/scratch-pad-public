export async function thrownBy(work: () => unknown): Promise<unknown> {
  return Promise.resolve()
    .then(work)
    .then(
      () => undefined,
      (error: unknown) => error,
    );
}
