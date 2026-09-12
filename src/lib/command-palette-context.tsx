"use client";

import { createContext, useContext } from "react";

export const CommandPaletteContext = createContext<{ open: () => void } | null>(null);

export function useOpenCommandPalette() {
  const ctx = useContext(CommandPaletteContext);
  return ctx?.open ?? (() => {});
}
