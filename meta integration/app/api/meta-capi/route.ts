// app/api/meta-capi/route.ts
import { NextRequest, NextResponse } from "next/server";
import { sendCapiEvent } from "@/lib/metaCapi";

export const runtime = "nodejs"; // crypto requis

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      eventId,
      eventName,
      value,
      currency = "DZD",
      contents,
      email,
      phone,
      firstName,
      lastName,
      city,
      fbp,
      fbc,
    } = body;

    if (!eventId || !eventName) {
      return NextResponse.json({ error: "eventId et eventName requis" }, { status: 400 });
    }

    const result = await sendCapiEvent({
      eventName,
      eventId,
      eventSourceUrl: req.headers.get("referer") || undefined,
      value,
      currency,
      contents,
      user: {
        email,
        phone,
        firstName,
        lastName,
        city,
        ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
        userAgent: req.headers.get("user-agent") || undefined,
        // priorité aux cookies envoyés par le client, sinon ceux de la requête
        fbp: fbp || req.cookies.get("_fbp")?.value,
        fbc: fbc || req.cookies.get("_fbc")?.value,
      },
    });

    return NextResponse.json(result.data, { status: result.ok ? 200 : 400 });
  } catch (e) {
    console.error("[meta-capi] route error", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
