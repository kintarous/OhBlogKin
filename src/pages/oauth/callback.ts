import type { APIRoute } from 'astro';

export const prerender = false;

function popupPage(messageScript: string, debugInfo: string = ''): Response {
  return new Response(
    `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <style>
      body { font-family: monospace; padding: 20px; background: #111; color: #0f0; font-size: 13px; }
      pre { white-space: pre-wrap; word-break: break-all; border: 1px solid #0f0; padding: 10px; margin-top: 10px; }
    </style>
  </head>
  <body>
    <pre>${debugInfo}</pre>
    <pre id="log">Running JS...</pre>
    <script>
      (function() {
        var log = document.getElementById('log');
        var openerAvailable = !!window.opener;
        var result;
        try {
          ${messageScript}
          result = 'postMessage dispatched OK';
        } catch(e) {
          result = 'postMessage ERROR: ' + e.message;
        }
        log.textContent = '--- JS Log ---\\n' +
          'window.opener: ' + (openerAvailable ? 'AVAILABLE ✓' : 'NULL ✗') + '\\n' +
          'result: ' + result + '\\n' +
          'origin: ' + '*' + '\\n' +
          'closing in 30s...';
        setTimeout(function() { window.close(); }, 30000);
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
    `, 'ERROR: No code from GitHub');
  }

  if (!clientId || !clientSecret) {
    return popupPage(`
      window.opener && window.opener.postMessage(
        'authorization:github:error:Missing OAuth env variables',
        '*'
      );
    `, 'ERROR: Missing server env variables');
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
      `, `ERROR from GitHub: ${errorMsg}`);
    }

    const token = String(data.access_token);
    const tokenPreview = token.slice(0, 8) + '...';

    return popupPage(`
      var payload = JSON.stringify({ token: ${JSON.stringify(token)}, provider: 'github' });
      window.opener && window.opener.postMessage(
        'authorization:github:success:' + payload,
        '*'
      );
    `, `SUCCESS: Token received (${tokenPreview})\nSending postMessage to opener...\nWindow closes in 3s.`);

  } catch (error: any) {
    const errorMsg = String(error.message || 'Unknown error');
    return popupPage(`
      window.opener && window.opener.postMessage(
        'authorization:github:error:' + ${JSON.stringify(errorMsg)},
        '*'
      );
    `, `FETCH ERROR: ${errorMsg}`);
  }
};
