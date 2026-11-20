# @platform/messages

The text catalog. `MessageId` (an enum in constants) keys every user-facing and error text; placeholders use `{name}`.

```ts
import { MessageId } from "@platform/constants";
import { message } from "@platform/messages";

message(MessageId.RateLimited, { seconds: 7 }); // "Too many requests. Retry in 7 seconds."
```

Unknown placeholders stay visible, so a missing parameter is obvious.
