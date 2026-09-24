// app/api/drug-search/route.ts
//
// Proxies to the NIH National Library of Medicine's Clinical Table Search
// Service (RxTerms dataset) for real drug-name autocomplete suggestions.
//
// Free, no API key required.
// https://clinicaltables.nlm.nih.gov/

import { NextResponse } from "next/server";

const MAX_QUERY_LENGTH = 100;
const MAX_SUGGESTIONS = 8;
const REQUEST_TIMEOUT_MS = 5000;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const term = searchParams.get("q")?.trim() ?? "";

    if (!term || term.length < 2) {
      return NextResponse.json(
        { suggestions: [] },
        {
          headers: {
            "Cache-Control": "private, max-age=30",
          },
        }
      );
    }

    if (term.length > MAX_QUERY_LENGTH) {
      return NextResponse.json(
        {
          error: `Search query must not exceed ${MAX_QUERY_LENGTH} characters.`,
        },
        { status: 400 }
      );
    }

    const url =
      `https://clinicaltables.nlm.nih.gov/api/rxterms/v3/search` +
      `?terms=${encodeURIComponent(term)}` +
      `&maxList=${MAX_SUGGESTIONS}`;

    const controller = new AbortController();

    const timeout = setTimeout(() => {
      controller.abort();
    }, REQUEST_TIMEOUT_MS);

    let res: Response;

    try {
      res = await fetch(url, {
        method: "GET",
        signal: controller.signal,
        headers: {
          Accept: "application/json",
        },
        cache: "no-store",
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!res.ok) {
      throw new Error(`NLM API returned ${res.status}`);
    }

    const data: unknown = await res.json();

    const suggestions =
      Array.isArray(data) &&
      Array.isArray(data[1])
        ? data[1]
            .filter(
              (item): item is string =>
                typeof item === "string"
            )
            .slice(0, MAX_SUGGESTIONS)
        : [];

    return NextResponse.json(
      { suggestions },
      {
        headers: {
          "Cache-Control": "private, max-age=30",
        },
      }
    );
  } catch (error) {
    if (
      error instanceof Error &&
      error.name === "AbortError"
    ) {
      console.error("Drug search request timed out.");
    } else {
      console.error("Drug search error:", error);
    }

    // Fail soft — the pharmacy input still works as a plain
    // text field when the external suggestion service is unavailable.
    return NextResponse.json(
      { suggestions: [] },
      {
        headers: {
          "Cache-Control": "private, max-age=10",
        },
      }
    );
  }
}