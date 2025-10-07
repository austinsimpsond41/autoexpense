import { fromBuffer } from "pdf2pic";

const ALL_PAGES_SENTINEL_VALUE = -1;

export async function pdfToImages(pdfBuffer: Buffer) {
	const convert = fromBuffer(pdfBuffer, {
		density: 72,
		width: 1024,
		height: 1024,
		preserveAspectRatio: true,
		format: "png",
	});

	const conversionResult = await convert.bulk(ALL_PAGES_SENTINEL_VALUE, {
		responseType: "buffer",
	});

	return conversionResult.map((x) => x.buffer!.buffer);
}
