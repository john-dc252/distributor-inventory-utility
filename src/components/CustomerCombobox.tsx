import {Customer, state} from "../store";
import {Combobox} from "./Combobox";
import {CustomerAvatar} from "./CustomerAvatar";
import {createMemo, Show} from "solid-js";

const selectCustomerOption: Customer = {id: "", name: "Select a customer", createdAt: ""};
const selectAllCustomer: Customer = {id: "", name: "All Customers", createdAt: ""};

export function CustomerCombobox(props: { value?: string; onSelect: (id: string) => void; allowAll?: boolean }) {
  const options = createMemo(() => props.allowAll ? [selectAllCustomer, ...state.customers] : [selectCustomerOption, ...state.customers]);
  return (
    <Combobox
      value={props.value}
      onSelect={props.onSelect}
      options={options()}
      filterFn={(customer, q) => customer.name.toLowerCase().includes(q)}
      placeholder="— select customer —"
      searchPlaceholder="Search customers..."
      emptyText="No customers found"
      renderTrigger={(customer) => (
        <span class="flex items-center gap-2 min-w-0">
          <Show when={customer.id}>
            <CustomerAvatar customer={customer} size="sm"/>
          </Show>
          <span class="text-sm truncate">{customer.name}</span>
        </span>
      )}
      renderOption={(customer) => (
        <>
          <Show when={customer.id}>
            <CustomerAvatar customer={customer} size="sm"/>
          </Show>
          <span class="text-sm truncate">{customer.name}</span>
        </>
      )}
    />
  );
}
