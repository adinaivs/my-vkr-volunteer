import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`;

  if (!googleClientId) {
    return NextResponse.json(
      { error: 'Google Client ID не настроен' },
      { status: 500 }
    );
  }

  const params = new URLSearchParams({
    client_id: googleClientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'consent',
  });

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

  return NextResponse.redirect(authUrl);
}
