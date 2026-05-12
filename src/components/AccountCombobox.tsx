import {createMemo, Show} from "solid-js";
import {getLeafAccounts, state} from "../store";
import {Combobox} from "./Combobox";

type AccountOption = { id: string; code: string; name: string; customerSpecific: boolean };

interface AccountDisplayProps {
  option: AccountOption;
}

function AccountDisplay(props: AccountDisplayProps) {
  return (
    <span class="flex items-center gap-1.5 min-w-0">
      <Show when={props.option.code}>
        <span class="font-mono text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded shrink-0">{props.option.code}</span>
      </Show>
      <span class="text-sm truncate">{props.option.name}</span>
    </span>
  );
}

const selectAccountOption: AccountOption = {id: "", code: "", name: "Select an account", customerSpecific: false};
const allAccountsOption: AccountOption = {id: "", code: "", name: "All Accounts", customerSpecific: false};

export function AccountCombobox(props: {
  value?: string;
  onSelect: (id: string) => void;
  excludePerCustomer?: boolean;
  allowAll?: boolean;
}) {
  const options = createMemo<AccountOption[]>(() => {
    const leaves = getLeafAccounts(state.accounts);
    const filtered = props.excludePerCustomer
      ? leaves.filter(a => !a.customerSpecific)
      : leaves;
    const mapped = filtered.map(a => ({id: a.id, code: a.code, name: a.name, customerSpecific: a.customerSpecific}));
    return props.allowAll ? [allAccountsOption, ...mapped] : [selectAccountOption, ...mapped];
  });

  return (
    <Combobox
      value={props.value}
      onSelect={props.onSelect}
      options={options()}
      filterFn={(opt, q) =>
        opt.code.toLowerCase().includes(q) ||
        opt.name.toLowerCase().includes(q)
      }
      placeholder="— select account —"
      searchPlaceholder="Search accounts..."
      emptyText="No accounts found"
      renderTrigger={(opt) => <AccountDisplay option={opt}/>}
      renderOption={(opt) => <AccountDisplay option={opt}/>}
    />
  );
}
