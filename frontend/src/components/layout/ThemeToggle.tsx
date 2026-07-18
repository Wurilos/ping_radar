'use client';

import { Monitor, Moon, Sun } from 'lucide-react';
import { ThemePreference, useTheme } from '@/lib/theme-context';

const options: Array<{ value: ThemePreference; label: string; icon: typeof Sun }> = [
  { value: 'light', label: 'Claro', icon: Sun },
  { value: 'dark', label: 'Escuro', icon: Moon },
  { value: 'system', label: 'Sistema', icon: Monitor },
];

export default function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const ActiveIcon = resolvedTheme === 'light' ? Sun : Moon;

  return (
    <div className="theme-picker" title={`Tema atual: ${theme}`}>
      <ActiveIcon size={17} />
      <select
        aria-label="Selecionar tema"
        value={theme}
        onChange={(event) => setTheme(event.target.value as ThemePreference)}
      >
        {options.map(option => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </div>
  );
}
