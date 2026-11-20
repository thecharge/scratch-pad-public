# @platform/masking

`PathMasker` implements the pipeline's `Masker`. It decides which fields a principal sees in a result, using the capability's `mask` rules: `remove`, `replace` or `partial`. A rule with `unlessScope` leaves the field alone for principals holding that scope. Paths are dot-separated and walk through arrays. The input is never mutated, and the result lists the rule paths that changed something (never the values).

`partial` keeps at most half of a string visible, so a short value is never revealed whole.

`sensitivePaths(capabilities)` is the shared list of paths that must not be logged or recorded: the built-in credential paths plus every masked path. The logger's redaction list and the knowledge-base recorder both use it, so the three never drift.
