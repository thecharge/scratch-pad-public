declare module "*.css";

interface ImportMetaEnv {
  readonly VITE_API_ORIGIN?: string;
  readonly VITE_CLIENT_ID?: string;
}

interface ImportMeta {
  readonly env?: ImportMetaEnv;
}
