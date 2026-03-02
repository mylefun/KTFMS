import React, { createContext, useContext, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
    theme: Theme;
    setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setTheme] = useState<Theme>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('themeSettings');
            if (saved === 'light' || saved === 'dark' || saved === 'system') {
                return saved as Theme;
            }
        }
        return 'system';
    });

    useEffect(() => {
        const applyTheme = (t: Theme) => {
            console.log('Force applying theme:', t);
            console.error('DEBUG: Theme application start for:', t);
            const root = window.document.documentElement;
            const body = window.document.body;
            root.classList.remove('light', 'dark');
            body.classList.remove('light', 'dark');

            let resolved: 'light' | 'dark';
            if (t === 'system') {
                resolved = window.matchMedia('(prefers-color-scheme: dark)').matches
                    ? 'dark'
                    : 'light';
            } else {
                resolved = t;
            }

            root.className = resolved;
            body.className = resolved + " min-h-screen transition-colors duration-300";

            // Also try data attribute just in case
            root.setAttribute('data-theme', resolved);

            console.log('Class list after application:', root.className);
            console.error('DEBUG: Theme applied to HTML and Body:', resolved);
        };

        localStorage.setItem('themeSettings', theme);
        applyTheme(theme);

        if (theme === 'system') {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            const handleChange = () => applyTheme('system');
            mediaQuery.addEventListener('change', handleChange);
            return () => mediaQuery.removeEventListener('change', handleChange);
        }
    }, [theme]);

    return (
        <ThemeContext.Provider value={{ theme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}
