import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get('lat');
  const lon = searchParams.get('lon');

  if (!lat || !lon) {
    return NextResponse.json({ error: 'lat and lon are required' }, { status: 400 });
  }

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1&accept-language=ru`,
      {
        headers: {
          'User-Agent': 'VolunteerApp/1.0',
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      return NextResponse.json({ error: 'Geocoding failed' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return NextResponse.json({ error: 'Failed to fetch address' }, { status: 500 });
  }
}
