<script lang="ts" module>
	export const ICONS = {
		search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14ZM20 20l-4-4',
		close: 'M6 6l12 12M18 6 6 18',
		copy: 'M9 9h9a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1ZM5 15H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v1',
		check: 'M4 12.5 9 17.5 20 6.5',
		star: 'm12 3.5 2.6 5.6 6.1.8-4.5 4.2 1.2 6-5.4-3-5.4 3 1.2-6-4.5-4.2 6.1-.8L12 3.5Z',
		swap: 'M7 4v13m0 0-3-3m3 3 3-3M17 20V7m0 0-3 3m3-3 3 3',
		link: 'M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1',
		print: 'M7 9V4h10v5M7 18H5a1 1 0 0 1-1-1v-5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1h-2M7 15h10v5H7z',
		download: 'M12 4v11m0 0 4-4m-4 4-4-4M4 19h16',
		sun: 'M12 6.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4',
		moon: 'M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z',
		monitor: 'M4 5h16v10H4zM9 19h6M12 15v4',
		shuffle: 'M4 6h3l8 12h5M4 18h3l2-3M17 4l3 2-3 2M17 16l3 2-3 2',
		plus: 'M12 5v14M5 12h14',
		minus: 'M5 12h14',
		trash: 'M5 7h14M9 7V5h6v2M7 7l1 13h8l1-13',
		play: 'M7 4.5v15l13-7.5z',
		pause: 'M8 5h3v14H8zM13 5h3v14h-3z',
		reset: 'M4 12a8 8 0 1 0 2.5-5.8M4 4v4h4',
		chevron: 'm9 5 7 7-7 7',
		back: 'M15 5 8 12l7 7',
		grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
		dice: 'M5 5h14v14H5zM9 9h.01M15 15h.01M9 15h.01M15 9h.01',
		info: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM12 11v6M12 7.5v.01',
		warning: 'M12 4 2.5 20h19L12 4ZM12 10v5M12 17.5v.01',
		external: 'M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5'
	} as const;

	export type IconName = keyof typeof ICONS;
</script>

<script lang="ts">
	interface Props {
		name: IconName;
		size?: number;
		/** Filled rendering, used for the favourite star. */
		fill?: boolean;
	}

	let { name, size = 18, fill = false }: Props = $props();
</script>

<svg
	width={size}
	height={size}
	viewBox="0 0 24 24"
	fill={fill ? 'currentColor' : 'none'}
	stroke="currentColor"
	stroke-width="1.8"
	stroke-linecap="round"
	stroke-linejoin="round"
	aria-hidden="true"
	focusable="false"
>
	<path d={ICONS[name]} />
</svg>
