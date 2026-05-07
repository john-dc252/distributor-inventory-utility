import {Show} from "solid-js";
import {Customer} from "../store";

export function CustomerAvatar(props: { customer: Customer; size: "xs" | "sm" | "md" }) {
  return (
    <Show when={props.customer.photo} fallback={
      <div class={
        props.size === "md"
          ? "w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-indigo-600 dark:text-indigo-300 font-bold text-sm shrink-0"
          : props.size === "sm"
            ? "w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-indigo-600 dark:text-indigo-300 font-bold text-[10px] shrink-0"
            : "w-4 h-4 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-indigo-600 dark:text-indigo-300 font-bold text-[8px] shrink-0"
      }>
        {props.customer.name[0]?.toUpperCase()}
      </div>
    }>
      <img
        src={props.customer.photo!}
        alt={props.customer.name}
        class={
          props.size === "md"
            ? "w-9 h-9 rounded-full object-cover border dark:border-gray-600 shrink-0"
            : props.size === "sm"
              ? "w-5 h-5 rounded-full object-cover border dark:border-gray-600 shrink-0"
              : "w-4 h-4 rounded-full object-cover border dark:border-gray-600 shrink-0"
        }
      />
    </Show>
  );
}
