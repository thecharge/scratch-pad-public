# Assets

Private binary asset storage for the capability API. Uploads stream through bounded multipart writes and validate the configured media type, size and SHA-256 checksum. Failed uploads remove partial bytes and metadata. Metadata becomes visible after upload completion and is filtered by owner.

`createAssetStore` receives storage configuration and optionally injected object clients. Downloads use short-lived signed URLs through the configured public object-store endpoint. The API, MCP resources and SDK expose this store through the shared capability contracts.
