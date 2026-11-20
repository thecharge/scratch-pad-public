---
name: operating-the-service
description: Look at the running service and change its public configuration as an administrator. Use when a task needs request statistics, recent request events or a new banner text. Needs the admin scope.
metadata:
  auth: required
  scopes: admin
---

# Operating the service

Everything here needs a token with the `admin` scope. A caller without it is not offered this skill.

## Steps

1. Read the statistics: call `stats.get` with `name` set to `stats`. The answer holds `total`, `errors`, `cacheHits` and, per capability, a `count`.
2. Read recent request events: call `logs.list`. Pass `limit` to bound the number of events (100 by default, 500 at most), `kind` to keep one kind of event (`request`, `decision`, `error`, `cache` or `mask`) and `capability` to keep the events of one capability, for example `books.list`.
3. Read the public configuration: call `config.get` with `name` set to `config`. No token is needed for this call.
4. Change the configuration: call `config.update` with `name` set to `config` and `bannerText`, `pageSizeDefault` or both. Only the fields you send change.

## Notes

- The statistics and the events are kept in memory since the server started, so a restart empties them. The server keeps the last 500 events.
- The configuration is public: every caller sees the banner text you set.
