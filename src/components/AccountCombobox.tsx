import {createMemo} from "solid-js";
import {ACCOUNT_LABELS, ACCOUNT_TYPES, AccountType, PER_CUSTOMER_ACCOUNTS} from "../store";
import {Combobox} from "./Combobox";

type AccountOption = { id: AccountType; label: string };

const allLeafOptions: AccountOption[] = Object.values(ACCOUNT_TYPES).map(type => ({
  id: type,
  label: (ACCOUNT_LABELS as Record<string, string>)[type] ?? type,
}));

export function AccountCombobox(props: {
  value: AccountType;
  onSelect: (type: AccountType) => void;
  excludePerCustomer?: boolean;
}) {
  const options = createMemo(() =>
    props.excludePerCustomer
      ? allLeafOptions.filter(o => !PER_CUSTOMER_ACCOUNTS.has(o.id))
      : allLeafOptions
  );

  return (
    <Combobox
      value={props.value}
      onSelect={(id) => props.onSelect(id as AccountType)}
      options={options()}
      filterFn={(opt, q) => opt.label.toLowerCase().includes(q)}
      placeholder="— select account —"
      searchPlaceholder="Search accounts..."
      emptyText="No accounts found"
      renderTrigger={(opt) => (
        <span class="text-sm truncate">{opt.label}</span>
      )}
      renderOption={(opt) => (
        <span class="truncate">{opt.label}</span>
      )}
    />
  );
}
