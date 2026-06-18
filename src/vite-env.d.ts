/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_FACADE_URL?: string;
  readonly VITE_API_TOKEN?: string;
  readonly VITE_BUSINESS_ID?: string;
  readonly VITE_BRANCH_ID?: string;
  readonly VITE_STAFF_ID?: string;
  readonly VITE_USER_ID?: string;
  readonly VITE_STAFF_NAME?: string;
  readonly VITE_SALON_NAME?: string;
  readonly VITE_PERIOD?: string;
  readonly VITE_CURRENCY?: string;
  readonly VITE_START_DATE?: string;
  readonly VITE_END_DATE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
