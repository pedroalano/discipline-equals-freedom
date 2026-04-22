'use client';

import { useTheme } from 'next-themes';
import { Sun, Moon, Monitor, Check } from 'lucide-react';
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

export function ThemeToggle() {
  const { setTheme } = useTheme();
  const font = useFontStore((s) => s.font);
  const setFont = useFontStore((s) => s.setFont);

  return (
    <TooltipProvider>
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Appearance">
                <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>Appearance</TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="end">
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
              {font === f ? <Check className="mr-2 h-4 w-4" /> : <span className="mr-2 h-4 w-4" />}
              {FONT_LABELS[f]}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </TooltipProvider>
  );
}
