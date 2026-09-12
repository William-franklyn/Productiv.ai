"use client";

import { useCommandPaletteShortcut } from "@/lib/command-palette";
import { CommandPaletteContext } from "@/lib/command-palette-context";
import { CommandPalette } from "@/components/CommandPalette";

export function CommandPaletteProvider({ children }: { children: React.ReactNode }) {
  const { open, setOpen } = useCommandPaletteShortcut();

  return (
    <CommandPaletteContext.Provider value={{ open: () => setOpen(true) }}>
      {children}
      <CommandPalette open={open} onClose={() => setOpen(false)} />
    </CommandPaletteContext.Provider>
  );
}
