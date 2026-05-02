'use client';

import { useTheme } from 'next-themes';
import { Palette, Sun, Moon, Monitor, Check } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useFontStore, FONT_LABELS, type FontOption } from '@/store/font';

const FONT_OPTIONS: FontOption[] = ['cormorant', 'lora', 'inter', 'spectral'];

export function AppearanceIsland() {
  const { setTheme } = useTheme();
  const font = useFontStore((s) => s.font);
  const setFont = useFontStore((s) => s.setFont);

  return (
    <div className="fixed bottom-6 left-6 z-30">
      <TooltipProvider>
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="glass"
                  size="icon"
                  className="rounded-full backdrop-blur-sm"
                  aria-label="Appearance"
                >
                  <Palette className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="right">Appearance</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="start" side="top">
            <DropdownMenuLabel>Theme</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => setTheme('light')}>
              <Sun className="mr-2 h-4 w-4" />
              Light
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme('dark')}>
              <Moon className="mr-2 h-4 w-4" />
              Dark
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme('system')}>
              <Monitor className="mr-2 h-4 w-4" />
              System
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Font</DropdownMenuLabel>
            {FONT_OPTIONS.map((f) => (
              <DropdownMenuItem key={f} onClick={() => setFont(f)}>
                {font === f ? (
                  <Check className="mr-2 h-4 w-4" />
                ) : (
                  <span className="mr-2 h-4 w-4" />
                )}
                {FONT_LABELS[f]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </TooltipProvider>
    </div>
  );
}
