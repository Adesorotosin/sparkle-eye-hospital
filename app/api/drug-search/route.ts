// app/api/drug-search/route.ts
//
// Proxies to the NIH National Library of Medicine's Clinical Table Search
// Service (RxTerms dataset) for real drug-name autocomplete suggestions.
// Free, no API key required. See: https://clinicaltables.nlm.nih.gov/
//
// Response shape from NLM is a positional array, not an object:
//   [totalCount, [displayNames...], extraFieldsOrNull, [[rowValues...]]]

import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const term = searchParams.get("q")?.trim();

    if (!term || term.length < 2) {
      return NextResponse.json({ suggestions: [] });
    }

    const url = `https://clinicaltables.nlm.nih.gov/api/rxterms/v3/search?terms=${encodeURIComponent(
      term
    )}&maxList=8`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`NLM API returned ${res.status}`);

    const data = await res.json();
    const suggestions: string[] = Array.isArray(data?.[1]) ? data[1] : [];

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error("Drug search error:", error);
    // Fail soft — the input still works as a plain text field even if the
    // suggestion service is unreachable.
    return NextResponse.json({ suggestions: [] });
  }
}
