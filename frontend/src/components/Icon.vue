<script setup lang="ts">
withDefaults(defineProps<{ name: string; size?: number }>(), { size: 18 });
const paths: Record<string, string[]> = {
  book: ['M4 4h6a3 3 0 0 1 3 3v14a4 4 0 0 0-4-2H4z', 'M20 4h-4a3 3 0 0 0-3 3v14a4 4 0 0 1 4-2h3z'],
  search: ['m21 21-4.5-4.5', 'M19 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0'],
  chart: ['M4 3v18h17', 'M8 16v-5', 'M13 16V7', 'M18 16v-8'],
  file: [
    'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z',
    'M14 2v6h6',
    'M8 13h8',
    'M8 17h5',
  ],
  edit: ['m16 3 5 5', 'm3 16 13-13a2 2 0 0 1 3 0l2 2a2 2 0 0 1 0 3L8 21H3z'],
  settings: ['M4 6h16', 'M4 12h16', 'M4 18h16', 'M8 4v4', 'M16 10v4', 'M10 16v4'],
  plus: ['M12 5v14', 'M5 12h14'],
  close: ['m6 6 12 12', 'm18 6-12 12'],
  left: ['m12 5-7 7 7 7', 'M5 12h15'],
  right: ['m9 5 7 7-7 7'],
  down: ['m6 9 6 6 6-6'],
  star: ['m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-2.9-5.6 2.9 1.1-6.2L3 9.6l6.2-.9z'],
  check: ['m5 12 4 4L19 6'],
  menu: ['M4 6h16', 'M4 12h16', 'M4 18h16'],
  trash: ['M3 6h18', 'M9 6V3h6v3', 'm5 6 1 15h12l1-15', 'M10 10v7', 'M14 10v7'],
  upload: ['M12 16V3', 'm7 8 5-5 5 5', 'M4 16v5h16v-5'],
  download: ['M12 3v13', 'm7 11 5 5 5-5', 'M4 16v5h16v-5'],
  play: ['m8 4 12 8-12 8z'],
  clock: ['M12 8v5l3 2', 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0'],
  layers: ['m12 3 10 5-10 5L2 8z', 'm2 12 10 5 10-5', 'm2 16 10 5 10-5'],
  grid: ['M3 3h7v7H3z', 'M14 3h7v7h-7z', 'M3 14h7v7H3z', 'M14 14h7v7h-7z'],
  logout: ['M9 4H4v16h5', 'M9 12h12', 'm16 7 5 5-5 5'],
  image: ['M3 3h18v18H3z', 'm3 17 6-6 5 5 3-3 4 4', 'M16 7h.01'],
  link: [
    'M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-2 2',
    'M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l2-2',
  ],
  code: ['m8 6-6 6 6 6', 'm16 6 6 6-6 6', 'm14 3-4 18'],
  list: ['M8 6h13', 'M8 12h13', 'M8 18h13', 'M3 6h.01', 'M3 12h.01', 'M3 18h.01'],
  undo: ['M3 10h11a6 6 0 0 1 0 12', 'm7 6-4 4 4 4'],
  redo: ['M21 10H10a6 6 0 0 0 0 12', 'm17 6 4 4-4 4'],
  info: ['M12 11v6', 'M12 7h.01', 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0'],
  target: [
    'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0',
    'M17 12a5 5 0 1 1-10 0 5 5 0 1 1 10 0',
    'M12 12h.01',
  ],
  moon: ['M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z'],
  sun: [
    'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
    'M12 2v2',
    'M12 20v2',
    'm4.9 4.9 1.4 1.4',
    'm17.7 17.7 1.4 1.4',
    'M2 12h2',
    'M20 12h2',
    'm4.9 19.1 1.4-1.4',
    'm17.7 6.3 1.4-1.4',
  ],
};
</script>
<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.7"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    class="ui-icon"
  >
    <path v-for="(p, i) in paths[name] || paths.book" :key="i" :d="p" />
  </svg>
</template>
