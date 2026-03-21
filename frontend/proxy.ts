import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Auth proxy disabled — allow all requests through.
export function proxy(_request: NextRequest) {
	return NextResponse.next();
}
