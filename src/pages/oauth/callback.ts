import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const code = url.searchParams.get('code');
  const clientId = process.env.OAUTH_GITHUB_CLIENT_ID;
  const clientSecret = process.env.OAUTH_GITHUB_CLIENT_SECRET;

  if (!code) {
    return new Response('Missing authorization code from GitHub.', { status: 400 });
  }

  if (!clientId || !clientSecret) {
    return new Response('Missing OAuth environment variables on server.', { status: 500 });
  }

  try {
    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
      }),
    });

    const data = await response.json();

    if (data.error) {
      const errorMsg = data.error_description || data.error;
      return new Response(
        `<html>
          <body>
            <script>
              window.opener.postMessage("authorization:github:error:${errorMsg}", "*");
              window.close();
            </script>
          </body>
        </html>`,
        { headers: { 'Content-Type': 'text/html' } }
      );
    }

    const payload = JSON.stringify({
      token: data.access_token,
      provider: 'github',
    });

    // Send success message to opener and close popup
    return new Response(
      `<html>
        <body>
          <script>
            window.opener.postMessage("authorization:github:success:${payload.replace(/"/g, '\\"')}", "*");
            window.close();
          </script>
        </body>
      </html>`,
      { headers: { 'Content-Type': 'text/html' } }
    );
  } catch (error: any) {
    const errorMsg = error.message || 'Unknown error';
    return new Response(
      `<html>
        <body>
          <script>
            window.opener.postMessage("authorization:github:error:${errorMsg}", "*");
            window.close();
          </script>
        </body>
      </html>`,
      { headers: { 'Content-Type': 'text/html' } }
    );
  }
};
