import {state} from "../store";
import {Combobox} from "./Combobox";
import {CustomerAvatar} from "./CustomerAvatar";

export function CustomerCombobox(props: { value: string; onSelect: (id: string) => void }) {
  return (
    <Combobox
      value={props.value}
      onSelect={props.onSelect}
      options={state.customers}
      filterFn={(customer, q) => customer.name.toLowerCase().includes(q)}
      placeholder="— select customer —"
      searchPlaceholder="Search customers..."
      emptyText="No customers found"
      renderTrigger={(customer) => (
        <span class="flex items-center gap-2 min-w-0">
                    <CustomerAvatar customer={customer} size="sm"/>
                    <span class="text-sm truncate">{customer.name}</span>
                </span>
      )}
      renderOption={(customer) => (
        <>
          <CustomerAvatar customer={customer} size="sm"/>
          <span class="text-sm truncate">{customer.name}</span>
        </>
      )}
    />
  );
}
