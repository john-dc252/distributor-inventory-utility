import {JSX} from "solid-js";

function EmptyState(props: { illustration: JSX.Element; message: string }) {
  return (
    <div class="w-full min-h-[50vh] flex flex-col items-center justify-center py-8 gap-6 text-gray-200 dark:text-gray-700">
      {props.illustration}
      <p class="text-sm text-gray-400 dark:text-gray-500">{props.message}</p>
    </div>
  );
}

export function ItemsEmptyState() {
  return (
    <EmptyState message="No items yet. Add one above." illustration={
      <svg viewBox="0 0 140 175" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-64 h-80">
        {/* Hanging string */}
        <line x1="70" y1="8" x2="70" y2="24" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
        {/* String loop */}
        <circle cx="70" cy="8" r="5.5" stroke="currentColor" stroke-width="3"/>
        {/* Tag body */}
        <rect x="18" y="24" width="104" height="143" rx="14" fill="currentColor"/>
        {/* Eyelet punch hole */}
        <circle cx="70" cy="39" r="8" fill="white" fill-opacity="0.28"/>
        {/* Label area */}
        <rect x="32" y="57" width="76" height="58" rx="8" fill="white" fill-opacity="0.12"/>
        {/* Item name line */}
        <line x1="44" y1="74" x2="96" y2="74" stroke="white" stroke-opacity="0.55" stroke-width="2.5" stroke-linecap="round"/>
        {/* SKU line */}
        <line x1="44" y1="88" x2="84" y2="88" stroke="white" stroke-opacity="0.35" stroke-width="2" stroke-linecap="round"/>
        {/* Description line */}
        <line x1="44" y1="102" x2="78" y2="102" stroke="white" stroke-opacity="0.35" stroke-width="2" stroke-linecap="round"/>
        {/* Barcode area */}
        <rect x="32" y="129" width="76" height="26" rx="5" fill="white" fill-opacity="0.1"/>
        {/* Barcode lines — alternating widths */}
        <line x1="40" y1="134" x2="40" y2="148" stroke="white" stroke-opacity="0.45" stroke-width="2.5"/>
        <line x1="44" y1="134" x2="44" y2="148" stroke="white" stroke-opacity="0.45" stroke-width="1"/>
        <line x1="47" y1="134" x2="47" y2="148" stroke="white" stroke-opacity="0.45" stroke-width="1.5"/>
        <line x1="50" y1="134" x2="50" y2="148" stroke="white" stroke-opacity="0.45" stroke-width="1"/>
        <line x1="53" y1="134" x2="53" y2="148" stroke="white" stroke-opacity="0.45" stroke-width="2.5"/>
        <line x1="57" y1="134" x2="57" y2="148" stroke="white" stroke-opacity="0.45" stroke-width="1"/>
        <line x1="60" y1="134" x2="60" y2="148" stroke="white" stroke-opacity="0.45" stroke-width="2"/>
        <line x1="63" y1="134" x2="63" y2="148" stroke="white" stroke-opacity="0.45" stroke-width="1"/>
        <line x1="67" y1="134" x2="67" y2="148" stroke="white" stroke-opacity="0.45" stroke-width="2.5"/>
        <line x1="71" y1="134" x2="71" y2="148" stroke="white" stroke-opacity="0.45" stroke-width="1"/>
        <line x1="74" y1="134" x2="74" y2="148" stroke="white" stroke-opacity="0.45" stroke-width="1.5"/>
        <line x1="77" y1="134" x2="77" y2="148" stroke="white" stroke-opacity="0.45" stroke-width="1"/>
        <line x1="80" y1="134" x2="80" y2="148" stroke="white" stroke-opacity="0.45" stroke-width="2.5"/>
        <line x1="84" y1="134" x2="84" y2="148" stroke="white" stroke-opacity="0.45" stroke-width="1"/>
        <line x1="87" y1="134" x2="87" y2="148" stroke="white" stroke-opacity="0.45" stroke-width="2"/>
        <line x1="90" y1="134" x2="90" y2="148" stroke="white" stroke-opacity="0.45" stroke-width="1"/>
        <line x1="94" y1="134" x2="94" y2="148" stroke="white" stroke-opacity="0.45" stroke-width="2.5"/>
        <line x1="98" y1="134" x2="98" y2="148" stroke="white" stroke-opacity="0.45" stroke-width="1"/>
        <line x1="101" y1="134" x2="101" y2="148" stroke="white" stroke-opacity="0.45" stroke-width="1.5"/>
      </svg>
    }/>
  );
}

export function CustomersEmptyState() {
  return (
    <EmptyState message="No customers yet. Add one above." illustration={
      <svg viewBox="0 0 185 130" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-80 h-56">
        {/* Back-left person */}
        <circle cx="50" cy="44" r="20" fill="currentColor" fill-opacity="0.5"/>
        <path d="M12 126 C12 96 28 78 50 78 C72 78 88 96 88 126 Z" fill="currentColor" fill-opacity="0.5"/>
        {/* Back-right person */}
        <circle cx="135" cy="44" r="20" fill="currentColor" fill-opacity="0.5"/>
        <path d="M97 126 C97 96 113 78 135 78 C157 78 173 96 173 126 Z" fill="currentColor" fill-opacity="0.5"/>
        {/* Center person — foreground */}
        <circle cx="92" cy="36" r="25" fill="currentColor"/>
        <path d="M50 126 C50 90 68 70 92 70 C116 70 134 90 134 126 Z" fill="currentColor"/>
        {/* Subtle highlight on center person */}
        <circle cx="92" cy="36" r="25" fill="white" fill-opacity="0.07"/>
        <path d="M50 126 C50 90 68 70 92 70 C116 70 134 90 134 126 Z" fill="white" fill-opacity="0.07"/>
      </svg>
    }/>
  );
}

export function TransactionsEmptyState() {
  return (
    <EmptyState message="No transactions yet." illustration={
      <svg viewBox="0 0 140 170" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-60 h-72">
        {/* Handle grip */}
        <line x1="94" y1="22" x2="126" y2="22" stroke="currentColor" stroke-width="9" stroke-linecap="round"/>
        {/* Vertical shaft */}
        <rect x="88" y="22" width="11" height="116" rx="5" fill="currentColor"/>

        {/* Box 3 — top */}
        <rect x="22" y="46" width="68" height="30" rx="5" fill="currentColor"/>
        <rect x="22" y="46" width="68" height="30" rx="5" fill="white" fill-opacity="0.16"/>
        <rect x="30" y="53" width="42" height="14" rx="3" fill="white" fill-opacity="0.18"/>
        <line x1="37" y1="60" x2="66" y2="60" stroke="white" stroke-opacity="0.48" stroke-width="2" stroke-linecap="round"/>

        {/* Box 2 — middle */}
        <rect x="22" y="76" width="68" height="32" rx="5" fill="currentColor"/>
        <rect x="22" y="76" width="68" height="32" rx="5" fill="white" fill-opacity="0.09"/>
        <rect x="30" y="84" width="44" height="14" rx="3" fill="white" fill-opacity="0.15"/>
        <line x1="37" y1="91" x2="68" y2="91" stroke="white" stroke-opacity="0.4" stroke-width="2" stroke-linecap="round"/>

        {/* Box 1 — bottom */}
        <rect x="22" y="108" width="68" height="28" rx="5" fill="currentColor"/>
        <rect x="22" y="108" width="68" height="28" rx="5" fill="white" fill-opacity="0.05"/>
        <rect x="30" y="115" width="40" height="12" rx="3" fill="white" fill-opacity="0.13"/>
        <line x1="37" y1="121" x2="64" y2="121" stroke="white" stroke-opacity="0.35" stroke-width="1.5" stroke-linecap="round"/>

        {/* Toe plate */}
        <rect x="16" y="136" width="83" height="10" rx="5" fill="currentColor"/>
        <rect x="16" y="136" width="83" height="10" rx="5" fill="white" fill-opacity="0.16"/>

        {/* Wheels */}
        <circle cx="36" cy="152" r="12" fill="currentColor"/>
        <circle cx="36" cy="152" r="6" fill="white" fill-opacity="0.22"/>
        <circle cx="90" cy="152" r="12" fill="currentColor"/>
        <circle cx="90" cy="152" r="6" fill="white" fill-opacity="0.22"/>
      </svg>
    }/>
  );
}
