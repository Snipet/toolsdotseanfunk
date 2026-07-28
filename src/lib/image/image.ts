/** Client-side image loading and export helpers. Nothing here touches a network. */

export interface LoadedImage {
	bitmap: ImageBitmap;
	name: string;
	type: string;
	size: number;
	width: number;
	height: number;
}

export async function loadImage(file: File): Promise<LoadedImage> {
	const bitmap = await createImageBitmap(file);
	return {
		bitmap,
		name: file.name,
		type: file.type || 'image/png',
		size: file.size,
		width: bitmap.width,
		height: bitmap.height
	};
}

export interface RenderOptions {
	width: number;
	height: number;
	/** Source rectangle, for cropping. Defaults to the whole image. */
	sx?: number;
	sy?: number;
	sw?: number;
	sh?: number;
	background?: string;
}

/** Draw a bitmap into a canvas at the requested size. */
export function render(bitmap: ImageBitmap, options: RenderOptions): HTMLCanvasElement {
	const canvas = document.createElement('canvas');
	canvas.width = Math.max(1, Math.round(options.width));
	canvas.height = Math.max(1, Math.round(options.height));

	const ctx = canvas.getContext('2d');
	if (!ctx) return canvas;

	// JPEG has no alpha, so a transparent PNG would export with black edges
	// unless we paint a background first.
	if (options.background) {
		ctx.fillStyle = options.background;
		ctx.fillRect(0, 0, canvas.width, canvas.height);
	}

	ctx.imageSmoothingEnabled = true;
	ctx.imageSmoothingQuality = 'high';
	ctx.drawImage(
		bitmap,
		options.sx ?? 0,
		options.sy ?? 0,
		options.sw ?? bitmap.width,
		options.sh ?? bitmap.height,
		0,
		0,
		canvas.width,
		canvas.height
	);
	return canvas;
}

export function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob | null> {
	return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

export function download(blob: Blob, filename: string): void {
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	a.click();
	URL.revokeObjectURL(url);
}

/** Swap the extension on a filename, keeping the stem. */
export function renameExtension(name: string, extension: string): string {
	return `${name.replace(/\.[^.]+$/, '')}.${extension}`;
}

/**
 * Binary-search the JPEG/WebP quality that lands just under a target size.
 * Twelve iterations is enough to converge to within a percent or so.
 */
export async function compressToTarget(
	canvas: HTMLCanvasElement,
	type: string,
	targetBytes: number
): Promise<{ blob: Blob; quality: number } | null> {
	let low = 0.05;
	let high = 1;
	let best: { blob: Blob; quality: number } | null = null;

	for (let i = 0; i < 12; i++) {
		const quality = (low + high) / 2;
		const blob = await canvasToBlob(canvas, type, quality);
		if (!blob) return best;
		if (blob.size <= targetBytes) {
			best = { blob, quality };
			low = quality;
		} else {
			high = quality;
		}
	}
	// Nothing fit even at the lowest quality; return that so the caller can warn.
	if (!best) {
		const blob = await canvasToBlob(canvas, type, 0.05);
		if (blob) best = { blob, quality: 0.05 };
	}
	return best;
}
