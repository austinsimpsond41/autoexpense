import { auth, getCurrentUser } from "@/lib/auth";
import { db } from "@/server/db";
import { storage } from "@/server/storage";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session) {
		return NextResponse.json({ message: "you are not signed in" }, { status: 401 });
	}

	const searchParams = req.nextUrl.searchParams;
	const receiptId = searchParams.get("id");
	if (!receiptId) {
		return NextResponse.json({ message: "invalid receipt id" }, { status: 400 });
	}

	const pageNumber = Number(searchParams.get("page") ?? "1");

	const receipt = await db.receipt.findUniqueOrThrow({
		where: {
			id: receiptId,
		},
	});

	const containerClient = storage.getContainerClient("receipts");
	const firstPictureBlobs = containerClient.listBlobsFlat({
		prefix: `${receipt.expenseReportId}/${receipt.id}/receipt-${pageNumber - 1}`,
	});

	let firstBlobName: string | undefined = undefined;
	for await (const blob of firstPictureBlobs) {
		firstBlobName = blob.name;
		break;
	}

	if (!firstBlobName) {
		return NextResponse.json({ message: "failed to get first blob for receipt" });
	}

	const blobClient = containerClient.getBlockBlobClient(firstBlobName);

	const fileInfo = await blobClient.getProperties();
	const fileDownload = await blobClient.download();

	const responseHeaders = new Headers();
	responseHeaders.set("Content-Type", fileInfo.contentType!);
	responseHeaders.set("Content-Disposition", `attachment;`);
	responseHeaders.set("Content-Length", fileInfo.contentLength!.toString());

	const stream = fileDownload.readableStreamBody!;
	const responseStream = new ReadableStream({
		start(controller) {
			stream.on("data", (chunk) => controller.enqueue(new Uint8Array(chunk)));
			stream.on("end", () => controller.close());
			stream.on("error", (err) => controller.error(err));
		},
		cancel() {
			stream.removeAllListeners();
		},
	});

	return new NextResponse(responseStream, { status: 200, headers: responseHeaders });
}
