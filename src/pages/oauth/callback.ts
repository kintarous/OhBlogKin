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
      pre { white-space: pre-wrap; word-break: break-all; }
      button { margin-top: 10px; padding: 6px 12px; background: #0f0; color: #000; border: none; cursor: pointer; font-size: 13px; }
    </style>
  </head>
  <body>
    <pre id="debug">${debugInfo}</pre>
    <button onclick="document.getElementById('log').style.display='block'">Show log</button>
    <pre id="log" style="display:none"></pre>
    <script>
      var log = document.getElementById('log');
      (function() {
        var result = (function() {
          try {
            ${messageScript}
            return 'postMessage sent successfully';
          } catch(e) {
            return 'ERROR: ' + e.message;
          }
        })();
        log.textContent = result + '\\n' +
          'window.opener: ' + (window.opener ? 'AVAILABLE' : 'NULL') + '\\n' +
          'origin: ' + window.location.origin;
        setTimeout(function() { window.close(); }, 3000);
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
    `, 'ERROR: No code from GitHub');
  }

  if (!clientId || !clientSecret) {
    return popupPage(`
      window.opener && window.opener.postMessage(
        'authorization:github:error:Missing OAuth environment variables on server',
        window.location.origin
      );
    `, 'ERROR: Missing env variables on server');
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
      `, 'ERROR from GitHub: ' + errorMsg);
    }

    const token = String(data.access_token);
    const tokenPreview = token.slice(0, 8) + '...';

    return popupPage(`
      var payload = JSON.stringify({ token: ${JSON.stringify(token)}, provider: 'github' });
      window.opener && window.opener.postMessage(
        'authorization:github:success:' + payload,
        window.location.origin
      );
    `, 'SUCCESS: Token received (' + ${JSON.stringify(tokenPreview)} + ')\nSending postMessage to opener...\nWindow will close in 3 seconds.');
  } catch (error: any) {
    const errorMsg = String(error.message || 'Unknown error');
    return popupPage(`
      window.opener && window.opener.postMessage(
        'authorization:github:error:' + ${JSON.stringify(errorMsg)},
        window.location.origin
      );
    `, 'FETCH ERROR: ' + errorMsg);
  }
};
