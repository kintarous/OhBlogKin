import type { APIRoute } from 'astro';

export const prerender = false;

// Builds a popup HTML page that sends a postMessage back to Decap CMS, then closes after a delay.
function popupPage(messageScript: string): Response {
  return new Response(
    `<!DOCTYPE html>
<html>
  <head><meta charset="utf-8"></head>
  <body>
    <script>
      (function() {
        ${messageScript}
        setTimeout(function() { window.close(); }, 500);
      })();
    <\/script>
  </body>
</html>`,
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );
}

export const GET: APIRoute = async ({ url }) => {
  const code = url.searchParams.get('code');
  const clientId = process.env.OAUTH_GITHUB_CLIENT_ID;
  const clientSecret = process.env.OAUTH_GITHUB_CLIENT_SECRET;

  if (!code) {
    return popupPage(`
      window.opener && window.opener.postMessage(
        'authorization:github:error:Missing authorization code',
        window.location.origin
      );
    `);
  }

  if (!clientId || !clientSecret) {
    return popupPage(`
      window.opener && window.opener.postMessage(
        'authorization:github:error:Missing OAuth environment variables on server',
        window.location.origin
      );
    `);
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
      const errorMsg = String(data.error_description || data.error);
      return popupPage(`
        window.opener && window.opener.postMessage(
          'authorization:github:error:' + ${JSON.stringify(errorMsg)},
          window.location.origin
        );
      `);
    }

    const token = String(data.access_token);

    // Pass token back to Decap CMS popup opener using the expected message format.
    // The token is JSON.stringify'd server-side so it's safely embedded as a JS string literal.
    return popupPage(`
      var payload = JSON.stringify({ token: ${JSON.stringify(token)}, provider: 'github' });
      window.opener && window.opener.postMessage(
        'authorization:github:success:' + payload,
        window.location.origin
      );
    `);
  } catch (error: any) {
    const errorMsg = String(error.message || 'Unknown error');
    return popupPage(`
      window.opener && window.opener.postMessage(
        'authorization:github:error:' + ${JSON.stringify(errorMsg)},
        window.location.origin
      );
    `);
  }
};
