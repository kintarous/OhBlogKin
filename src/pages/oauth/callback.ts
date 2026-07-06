import type { APIRoute } from 'astro';

export const prerender = false;

function popupPage(messageScript: string, message: string): Response {
  return new Response(
    `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>GitHub Login</title>
    <style>
      body {
        align-items: center;
        background: #f6f7f9;
        color: #111827;
        display: flex;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        justify-content: center;
        min-height: 100vh;
        margin: 0;
      }
      p { font-size: 16px; }
    </style>
  </head>
  <body>
    <p>${message}</p>
    <script>
      (function() {
        try {
          ${messageScript}
        } catch (error) {
          console.error(error);
        }
        setTimeout(function() { window.close(); }, 1000);
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
        '*'
      );
    `, 'Login gagal. Silakan tutup jendela ini dan coba lagi.');
  }

  if (!clientId || !clientSecret) {
    return popupPage(`
      window.opener && window.opener.postMessage(
        'authorization:github:error:Missing OAuth env variables',
        '*'
      );
    `, 'Konfigurasi OAuth belum lengkap.');
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
          '*'
        );
      `, 'GitHub menolak login. Silakan tutup jendela ini dan coba lagi.');
    }

    const token = String(data.access_token);

    return popupPage(`
      var payload = JSON.stringify({ token: ${JSON.stringify(token)}, provider: 'github' });
      window.opener && window.opener.postMessage(
        'authorization:github:success:' + payload,
        '*'
      );
    `, 'Login berhasil. Mengembalikan Anda ke admin...');

  } catch (error: any) {
    const errorMsg = String(error.message || 'Unknown error');
    return popupPage(`
      window.opener && window.opener.postMessage(
        'authorization:github:error:' + ${JSON.stringify(errorMsg)},
        '*'
      );
    `, 'Login gagal. Silakan tutup jendela ini dan coba lagi.');
  }
};
