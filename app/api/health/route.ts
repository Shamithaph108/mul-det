import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "Financial Forensics Engine",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    endpoints: {
      "POST /api/analyze":          "Upload CSV → full detection pipeline",
      "POST /api/rings/:ringId":    "Enrich a fraud ring with volume/timeline data",
      "GET  /api/health":           "This endpoint",
    },
  });
}
