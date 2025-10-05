"use client";

import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Moon, Sun, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useEffect, useState } from "react";

export function ThemeMenu() {
  const { resolvedTheme, setTheme, theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isDark = mounted && resolvedTheme === "dark";
  const activeTheme = mounted ? theme ?? "system" : "system";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-10 w-10"
          aria-label="Theme menu"
          title="Theme"
        >
          {isDark ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-32">
        <DropdownMenuItem
          onClick={() => setTheme("light")}
          className="flex items-center justify-between"
        >
          <span>Light</span>
          <Check
            aria-hidden="true"
            className={`h-4 w-4 transition-opacity ${activeTheme === "light" ? "opacity-100" : "opacity-0"}`}
          />
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme("dark")}
          className="flex items-center justify-between"
        >
          <span>Dark</span>
          <Check
            aria-hidden="true"
            className={`h-4 w-4 transition-opacity ${activeTheme === "dark" ? "opacity-100" : "opacity-0"}`}
          />
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme("system")}
          className="flex items-center justify-between"
        >
          <span>System</span>
          <Check
            aria-hidden="true"
            className={`h-4 w-4 transition-opacity ${activeTheme === "system" ? "opacity-100" : "opacity-0"}`}
          />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default ThemeMenu;
