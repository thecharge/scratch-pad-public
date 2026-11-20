# @platform/errors

`ApiError` is the one error type that maps to an AIP-193 response.

```ts
const error = new ApiError(CanonicalCode.NotFound, ErrorReason.ResourceNotFound, MessageId.ResourceNotFound, { name });
error.httpStatus;        // 404
error.toBody("api.example.com"); // { error: { code, message, status, details: [ErrorInfo] } }
```

`toApiError(unknown)` turns any other failure into a generic INTERNAL error without leaking its message. `toFailure()` / `ApiError.fromFailure()` convert to and from plain data.
