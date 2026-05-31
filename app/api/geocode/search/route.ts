import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q');

  if (!q) {
    return NextResponse.json({ error: 'q is required' }, { status: 400 });
  }

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&countrycodes=kg&addressdetails=1&accept-language=ru&limit=5`,
      {
        headers: {
          'User-Agent': 'VolunteerApp/1.0',
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      return NextResponse.json({ error: 'Search failed' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Geocoding search error:', error);
    return NextResponse.json({ error: 'Failed to search address' }, { status: 500 });
  }
}
