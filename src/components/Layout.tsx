import {createSignal, JSX, onCleanup, onMount, Show} from "solid-js";
import {A} from "@solidjs/router";
import {isLoaded} from "../store";
import ThemeToggle from "./ThemeToggle";
import type { RouteDefinition } from "@solidjs/router"; // Assuming RouteDefinition or similar type exists for router links

interface NavItem {
  href: string;
  label: string;
  end?: boolean;
}
const NAV: NavItem[] = [
  {href: "/", label: "Accounts", end: true},
  {href: "/items", label: "Items"},
  {href: "/customers", label: "Customers"},
  {href: "/transactions", label: "Transactions"},
  {href: "/templates", label: "Templates"},
];

export default function Layout(props: { children?: JSX.Element }) {
  const [menuOpen, setMenuOpen] = createSignal(false);
  const [headerVisible, setHeaderVisible] = createSignal(true);
  let lastScrollY = 0;

  onMount(() => {
    lastScrollY = window.scrollY;

    const onScroll = () => {
      const y = window.scrollY;
      if (window.innerWidth < 768) {
        if (y <= 0 || y < lastScrollY) {
          setHeaderVisible(true);
        } else if (y > lastScrollY + 4) {
          setHeaderVisible(false);
          setMenuOpen(false);
        }
      } else {
        setHeaderVisible(true);
      }
      lastScrollY = y;
    };

    const onResize = () => {
      if (window.innerWidth >= 768) setHeaderVisible(true);
    };

    window.addEventListener("scroll", onScroll, {passive: true});
    window.addEventListener("resize", onResize);
    onCleanup(() => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    });
  });

  return (
    <div class="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col transition-colors">
      <Show when={!isLoaded()}>
        <div class="fixed inset-0 z-50 bg-white/40 dark:bg-gray-900/50 flex items-center justify-center">
          <div class="bg-white dark:bg-gray-800 rounded-xl shadow-2xl px-8 py-6 flex flex-col items-center gap-3">
            <svg class="animate-spin w-8 h-8 text-indigo-600 dark:text-indigo-400" xmlns="http://www.w3.org/2000/svg"
                 fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
            </svg>
            <p class="text-sm font-medium text-gray-700 dark:text-gray-300">Loading data…</p>
          </div>
        </div>
      </Show>
      <nav
        class={`fixed top-0 left-0 right-0 z-30 bg-indigo-700 dark:bg-indigo-900 text-white shadow transition-transform duration-300 ease-in-out md:translate-y-0 ${headerVisible() ? "translate-y-0" : "-translate-y-full"}`}>
        <div class="max-w-6xl mx-auto px-4">
          <div class="flex items-center h-14">
            <span class="font-bold text-lg shrink-0">Distributor Inventory Utility</span>
            <ThemeToggle/>
            <button
              class="md:hidden ml-1 p-1.5 rounded hover:bg-indigo-600 transition-colors"
              onClick={() => setMenuOpen((o) => !o)}
              aria-label="Toggle menu"
            >
              <Show when={menuOpen()} fallback={
                <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24"
                     stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16"/>
                </svg>
              }>
                <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24"
                     stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </Show>
            </button>
          </div>
          <Show when={menuOpen()}>
            <div class="md:hidden pb-3 flex flex-col gap-1">
              {NAV.map((n) => (
                <A
                  href={n.href}
                  end={n.end}
                  class="px-3 py-2 rounded text-sm font-medium hover:bg-indigo-600 dark:hover:bg-indigo-700 transition-colors"
                  activeClass="bg-indigo-800 dark:bg-indigo-950"
                  onClick={() => setMenuOpen(false)}
                >
                  {n.label}
                </A>
              ))}
            </div>
          </Show>
        </div>
      </nav>
      <div class="flex flex-1 max-w-6xl mx-auto w-full px-4 mt-14">
        <aside
          class="hidden md:flex flex-col w-44 shrink-0 py-6 pr-4 border-r border-gray-200 dark:border-gray-700 sticky top-14 self-start h-[calc(100vh-3.5rem)]">
          {NAV.map((n) => (
            <A
              href={n.href}
              end={n.end}
              class="px-3 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-indigo-50 dark:hover:bg-indigo-950 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
              activeClass="bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-semibold"
            >
              {n.label}
            </A>
          ))}
        </aside>
        <main class="flex-1 min-w-0 py-6 md:pl-6">
          {props.children}
        </main>
      </div>
    </div>
  );
}
