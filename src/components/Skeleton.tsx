import {For} from "solid-js";

function SkeletonBlock(props: { class?: string }) {
  return <div class={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${props.class ?? ""}`}/>;
}

export function ItemCardSkeleton() {
  return (
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4 flex items-center gap-4">
      <SkeletonBlock class="w-12 h-12 shrink-0"/>
      <div class="flex-1 space-y-2 min-w-0">
        <SkeletonBlock class="h-4 w-48 max-w-full"/>
        <SkeletonBlock class="h-3 w-64 max-w-full"/>
      </div>
      <div class="flex gap-2 shrink-0">
        <SkeletonBlock class="h-4 w-7"/>
        <SkeletonBlock class="h-4 w-12"/>
      </div>
    </div>
  );
}

export function CustomerCardSkeleton() {
  return (
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4 flex items-center gap-4">
      <SkeletonBlock class="w-12 h-12 rounded-full shrink-0"/>
      <div class="flex-1 space-y-2 min-w-0">
        <SkeletonBlock class="h-4 w-40 max-w-full"/>
        <SkeletonBlock class="h-3 w-56 max-w-full"/>
      </div>
      <div class="flex gap-2 shrink-0">
        <SkeletonBlock class="h-4 w-7"/>
        <SkeletonBlock class="h-4 w-12"/>
      </div>
    </div>
  );
}

export function TemplateCardSkeleton() {
  return (
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <div class="flex items-start justify-between gap-2 mb-2">
        <div class="space-y-1.5 flex-1">
          <SkeletonBlock class="h-4 w-56 max-w-full"/>
          <SkeletonBlock class="h-3 w-14"/>
        </div>
        <div class="flex gap-2 shrink-0">
          <SkeletonBlock class="h-4 w-7"/>
          <SkeletonBlock class="h-4 w-12"/>
        </div>
      </div>
      <div class="flex gap-1.5 mt-3 flex-wrap">
        <SkeletonBlock class="h-5 w-36 rounded-full"/>
        <SkeletonBlock class="h-5 w-36 rounded-full"/>
      </div>
    </div>
  );
}

export function TransactionCardSkeleton() {
  return (
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <div class="flex items-start justify-between gap-2 mb-3">
        <div class="space-y-1.5">
          <SkeletonBlock class="h-4 w-56"/>
          <SkeletonBlock class="h-3 w-48"/>
        </div>
        <SkeletonBlock class="h-4 w-10 shrink-0"/>
      </div>
      <div class="border border-gray-100 dark:border-gray-700 rounded p-2 space-y-2">
        <SkeletonBlock class="h-3 w-28"/>
        <div class="flex gap-1.5 flex-wrap">
          <SkeletonBlock class="h-5 w-40 rounded-full"/>
          <SkeletonBlock class="h-5 w-40 rounded-full"/>
        </div>
      </div>
    </div>
  );
}

export function AccountCardSkeleton() {
  return (
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <SkeletonBlock class="h-4 w-40 mb-4"/>
      <div class="space-y-0.5">
        <For each={[0, 1, 2]}>
          {() => (
            <div class="flex justify-between items-center py-1.5">
              <SkeletonBlock class="h-3 w-44"/>
              <SkeletonBlock class="h-3 w-12"/>
            </div>
          )}
        </For>
      </div>
    </div>
  );
}
