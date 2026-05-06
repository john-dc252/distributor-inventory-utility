import { createSignal, createEffect } from "solid-js";
import { Router, Route, A } from "@solidjs/router";
import CustomersPage from "./pages/CustomersPage";
import AccountsPage from "./pages/AccountsPage";
import TransactionsPage from "./pages/TransactionsPage";
import TemplatesPage from "./pages/TemplatesPage";
import ItemsPage from "./pages/ItemsPage";

const NAV = [
  { href: "/", label: "Accounts", end: true },
  { href: "/items", label: "Items" },
  { href: "/customers", label: "Customers" },
  { href: "/transactions", label: "Transactions" },
  { href: "/templates", label: "Templates" },
];

const [dark, setDark] = createSignal(localStorage.getItem("theme") === "dark");

createEffect(() => {
  if (dark()) {
    document.documentElement.classList.add("dark");
    localStorage.setItem("theme", "dark");
  } else {
    document.documentElement.classList.remove("dark");
    localStorage.setItem("theme", "light");
  }
});

function ThemeToggle() {
  return (
    <button
      onClick={() => setDark((d) => !d)}
      class="ml-auto p-1.5 rounded hover:bg-indigo-600 transition-colors"
      title={dark() ? "Switch to light mode" : "Switch to dark mode"}
    >
      {dark() ? (
        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-yellow-300" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 3a1 1 0 0 1 1 1v1a1 1 0 1 1-2 0V4a1 1 0 0 1 1-1Zm0 15a1 1 0 0 1 1 1v1a1 1 0 1 1-2 0v-1a1 1 0 0 1 1-1Zm9-8a1 1 0 1 1 0 2h-1a1 1 0 1 1 0-2h1ZM4 12a1 1 0 0 1-1 1H2a1 1 0 1 1 0-2h1a1 1 0 0 1 1 1Zm14.95-6.364a1 1 0 0 1 0 1.414l-.707.707a1 1 0 1 1-1.414-1.414l.707-.707a1 1 0 0 1 1.414 0ZM6.757 17.657a1 1 0 0 1 0 1.414l-.707.707a1 1 0 1 1-1.414-1.414l.707-.707a1 1 0 0 1 1.414 0ZM18.95 18.364a1 1 0 0 1-1.414 0l-.707-.707a1 1 0 1 1 1.414-1.414l.707.707a1 1 0 0 1 0 1.414ZM7.464 6.05a1 1 0 0 1-1.414 0l-.707-.707A1 1 0 0 1 6.757 3.93l.707.707a1 1 0 0 1 0 1.414ZM12 7a5 5 0 1 0 0 10A5 5 0 0 0 12 7Z" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-indigo-100" fill="currentColor" viewBox="0 0 24 24">
          <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79Z" />
        </svg>
      )}
    </button>
  );
}

function Layout(props) {
  return (
    <div class="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col transition-colors">
      <nav class="bg-indigo-700 dark:bg-indigo-900 text-white shadow">
        <div class="max-w-6xl mx-auto px-4 flex items-center gap-1 h-14">
          <span class="font-bold text-lg mr-4 shrink-0">Distributor Utility</span>
          {NAV.map((n) => (
            <A
              href={n.href}
              end={n.end}
              class="px-3 py-1.5 rounded text-sm font-medium hover:bg-indigo-600 dark:hover:bg-indigo-700 transition-colors"
              activeClass="bg-indigo-800 dark:bg-indigo-950"
            >
              {n.label}
            </A>
          ))}
          <ThemeToggle />
        </div>
      </nav>
      <main class="flex-1 max-w-6xl mx-auto w-full px-4 py-6">
        {props.children}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Router root={Layout}>
      <Route path="/" component={AccountsPage} />
      <Route path="/items" component={ItemsPage} />
      <Route path="/customers" component={CustomersPage} />
      <Route path="/transactions" component={TransactionsPage} />
      <Route path="/templates" component={TemplatesPage} />
    </Router>
  );
}
