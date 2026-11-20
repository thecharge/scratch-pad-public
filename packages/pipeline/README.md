# @platform/pipeline

`createPipeline(deps)` returns `invoke(capability, rawInput, context)`.

Order: auth, rate limit, policy, validate, cache, handler, mask, observe. Optional steps run only when the capability declares the block. A declared `policy`, `mask` or `rateLimit` block without an implementation fails **before the handler runs**. Policy runs before validation, so a denied caller learns nothing about the input. Cache entries are stored before masking.
