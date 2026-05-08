import {createSignal, Show} from "solid-js";
import {SummaryTab} from "./accounts/SummaryTab";
import {ManageTab} from "./accounts/ManageTab";

type Tab = "summary" | "manage";

export default function AccountsPage() {
  const [tab, setTab] = createSignal<Tab>("summary");

  const tabCls = (t: Tab) =>
    `px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
      tab() === t
        ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
        : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
    }`;

  return (
    <div>
      <h1 class="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">Accounts</h1>

      <div class="flex gap-0 border-b border-gray-200 dark:border-gray-700 mb-6">
        <button type="button" onClick={() => setTab("summary")} class={tabCls("summary")}>Summary</button>
        <button type="button" onClick={() => setTab("manage")} class={tabCls("manage")}>Manage Accounts</button>
      </div>

      <Show when={tab() === "summary"}>
        <SummaryTab/>
      </Show>
      <Show when={tab() === "manage"}>
        <ManageTab/>
      </Show>
    </div>
  );
}
