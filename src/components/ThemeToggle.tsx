import {createEffect, createSignal} from 'solid-js';
import {dbGet, dbSet} from '../store/db';

const storedTheme = await dbGet<string>('theme') === 'dark';

export default function ThemeToggle() {
  const [dark, setDark] = createSignal(storedTheme);
  createEffect(() => {
    if (dark()) {
      document.documentElement.classList.add('dark');
      dbSet('theme', 'dark').then();
    } else {
      document.documentElement.classList.remove('dark');
      dbSet('theme', 'light').then();
    }
  });

  return (
    <button
      onClick={() => setDark((d) => !d)}
      class="ml-auto p-1.5 rounded hover:bg-indigo-600 transition-colors"
      title={dark() ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {dark() ? (
        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-yellow-300" fill="currentColor" viewBox="0 0 24 24">
          <path
            d="M12 3a1 1 0 0 1 1 1v1a1 1 0 1 1-2 0V4a1 1 0 0 1 1-1Zm0 15a1 1 0 0 1 1 1v1a1 1 0 1 1-2 0v-1a1 1 0 0 1 1-1Zm9-8a1 1 0 1 1 0 2h-1a1 1 0 1 1 0-2h1ZM4 12a1 1 0 0 1-1 1H2a1 1 0 1 1 0-2h1a1 1 0 0 1 1 1Zm14.95-6.364a1 1 0 0 1 0 1.414l-.707.707a1 1 0 1 1-1.414-1.414l.707-.707a1 1 0 0 1 1.414 0ZM6.757 17.657a1 1 0 0 1 0 1.414l-.707.707a1 1 0 1 1-1.414-1.414l.707-.707a1 1 0 0 1 1.414 0ZM18.95 18.364a1 1 0 0 1-1.414 0l-.707-.707a1 1 0 1 1 1.414-1.414l.707.707a1 1 0 0 1 0 1.414ZM7.464 6.05a1 1 0 0 1-1.414 0l-.707-.707A1 1 0 0 1 6.757 3.93l.707.707a1 1 0 0 1 0 1.414ZM12 7a5 5 0 1 0 0 10A5 5 0 0 0 12 7Z"/>
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-indigo-100" fill="currentColor" viewBox="0 0 24 24">
          <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79Z"/>
        </svg>
      )}
    </button>
  );
}
