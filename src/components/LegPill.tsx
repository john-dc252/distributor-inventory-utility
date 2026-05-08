import {ACCOUNT_LABELS, Leg} from "../store";

export function LegPill(props: {
  leg: Leg & { customerName?: string | null };
  side: "source" | "destination";
  hideLabel?: boolean;
}) {
  const label = () => (ACCOUNT_LABELS as Record<string, string>)[props.leg.accountType] ?? props.leg.accountType;
  return (
    <span class={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
      props.side === "source"
        ? "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300"
        : "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300"
    }`}>
      {!props.hideLabel && (props.side === "source" ? "From: " : "To: ")}{label()}
      {props.leg.customerName ? ` (${props.leg.customerName})` : ""} × {props.leg.qty}
    </span>
  );
}
