export enum FeatureFlag {
  BooksSuggest = "books-suggest",
}

export const FLAG_DEFAULTS: Readonly<Record<FeatureFlag, boolean>> = {
  [FeatureFlag.BooksSuggest]: false,
};

export const FLAG_SCENARIOS: Readonly<Record<FeatureFlag, string>> = {
  [FeatureFlag.BooksSuggest]: "feature-flag-books-suggest",
};

export enum FlagProviderKind {
  InMemory = "in-memory",
}

export enum FlagVariant {
  On = "on",
  Off = "off",
}

export const FLAG_DOMAIN = "platform";
export const FLAG_PAIR_SEPARATOR = "=";
export const FLAG_ON_TEXT = "true";
