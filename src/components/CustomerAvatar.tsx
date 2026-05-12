import {Show} from "solid-js";
import {Customer} from "../store";

export function CustomerAvatar(props: { customer: Customer; size: "xs" | "sm" | "md" }) {
  const getSizeClasses = (size: "xs" | "sm" | "md") => {
    switch (size) {
      case "md": return "w-9 h-9 text-sm";
      case "sm": return "w-5 h-5 text-[10px]";
      case "xs": return "w-4 h-4 text-[8px]";
    }
  };

  const baseClasses = "rounded-full shrink-0";
  const placeholderClasses = `bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-indigo-600 dark:text-indigo-300 font-bold ${baseClasses}`;
  const imageClasses = `object-cover border dark:border-gray-600 ${baseClasses}`;

  return (
    <Show when={props.customer.photo} fallback={
      <div class={`${placeholderClasses} ${getSizeClasses(props.size)}`}>
        {props.customer.name[0]?.toUpperCase()}
      </div>
    }>
      <img
        src={props.customer.photo!}
        alt={props.customer.name} // Alt text is good for accessibility
        class={`${imageClasses} ${getSizeClasses(props.size)}`}
      />
    </Show>
  );
}
