import {
  CADDY_TLS_INTERNAL_LINE,
  CertificateSource,
  HttpHeader,
  MessageId,
  PORT_SEPARATOR,
  Text,
} from "@platform/constants";
import { message } from "@platform/messages";
import {
  type DevelopmentApp,
  DevelopmentAppSchema,
  type ObjectStoreEnvironment,
  ObjectStoreEnvironmentSchema,
  type ProxyEnvironment,
  ProxyEnvironmentSchema,
} from "@platform/types";

export async function renderCaddyfile(
  proxy: ProxyEnvironment,
  upstreamHost: string,
  upstreamPort: number,
  applications: readonly DevelopmentApp[] = [],
  objectStore?: ObjectStoreEnvironment,
): Promise<string> {
  const checked = ProxyEnvironmentSchema.required({ secret: true }).parse(proxy);
  let rendered = message(MessageId.CaddyfileTemplate, {
    host: checked.host,
    port: checked.port,
    tls: checked.certificates === CertificateSource.Internal ? CADDY_TLS_INTERNAL_LINE : Text.Empty,
    upstream: [upstreamHost, upstreamPort].join(PORT_SEPARATOR),
    marker: HttpHeader.ProxyMarker,
    secret: checked.secret,
  });
  for (const application of applications) {
    const app = DevelopmentAppSchema.parse(application);
    rendered += message(MessageId.CaddyDevelopmentTemplate, {
      host: app.host,
      port: checked.port,
      tls:
        checked.certificates === CertificateSource.Internal ? CADDY_TLS_INTERNAL_LINE : Text.Empty,
      upstream: [app.address, app.port].join(PORT_SEPARATOR),
      api: [upstreamHost, upstreamPort].join(PORT_SEPARATOR),
      marker: HttpHeader.ProxyMarker,
      secret: checked.secret,
    });
  }
  if (objectStore !== undefined) {
    const store = ObjectStoreEnvironmentSchema.parse(objectStore);
    rendered += await renderWebsites(checked, store, upstreamHost, upstreamPort, checked.secret);
    rendered += message(MessageId.CaddyObjectStoreTemplate, {
      host: store.host,
      port: checked.port,
      tls:
        checked.certificates === CertificateSource.Internal ? CADDY_TLS_INTERNAL_LINE : Text.Empty,
      upstream: [store.address, store.port].join(PORT_SEPARATOR),
    });
  }
  return rendered;
}

async function renderWebsites(
  proxy: ProxyEnvironment,
  store: ObjectStoreEnvironment,
  upstreamHost: string,
  upstreamPort: number,
  secret: string,
): Promise<string> {
  let rendered: string = Text.Empty;
  const upstream = [store.address, store.port].join(PORT_SEPARATOR);
  for (const website of store.websites) {
    rendered += message(MessageId.CaddyWebsiteTemplate, {
      host: website.host,
      port: proxy.port,
      tls: proxy.certificates === CertificateSource.Internal ? CADDY_TLS_INTERNAL_LINE : Text.Empty,
      api: [upstreamHost, upstreamPort].join(PORT_SEPARATOR),
      marker: HttpHeader.ProxyMarker,
      secret,
      upstream,
      fallback: website.fallback
        ? message(MessageId.CaddyWebsiteFallback, { upstream })
        : Text.Empty,
    });
  }
  return rendered;
}
