import type { APIRoute } from 'astro';

export const prerender = false;

function sendAuthMessage(provider: string, content: string): Response {
	const authorizingMessage = `authorizing:${provider}`;
	const authorizationMessage = `authorization:${provider}:${content}`;

	return new Response(
		`<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>GitHub Login</title>
  </head>
  <body>
    <script>
      const receiveMessage = (message) => {
        window.opener.postMessage(
          ${JSON.stringify(authorizationMessage)},
          message.origin
        );
        window.removeEventListener('message', receiveMessage, false);
      };

      window.addEventListener('message', receiveMessage, false);
      window.opener.postMessage(${JSON.stringify(authorizingMessage)}, '*');
    </script>
  </body>
</html>`,
		{ headers: { 'Content-Type': 'text/html; charset=utf-8' } },
	);
}

export const GET: APIRoute = async ({ url }) => {
	const code = url.searchParams.get('code');
	const clientId = process.env.OAUTH_GITHUB_CLIENT_ID;
	const clientSecret = process.env.OAUTH_GITHUB_CLIENT_SECRET;

	if (!code) {
		return sendAuthMessage('github', 'error:Missing authorization code');
	}

	if (!clientId || !clientSecret) {
		return sendAuthMessage('github', 'error:Missing OAuth environment variables');
	}

	try {
		const response = await fetch('https://github.com/login/oauth/access_token', {
			method: 'POST',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				client_id: clientId,
				client_secret: clientSecret,
				code,
			}),
		});

		if (!response.ok) {
			return sendAuthMessage('github', `error:GitHub OAuth error ${response.status}`);
		}

		const data = await response.json();

		if (data.error) {
			return sendAuthMessage('github', `error:${String(data.error_description || data.error)}`);
		}

		if (!data.access_token) {
			return sendAuthMessage('github', 'error:No access token received from GitHub');
		}

		const payload = JSON.stringify({ token: String(data.access_token), provider: 'github' });

		return sendAuthMessage('github', `success:${payload}`);
	} catch (error) {
		return sendAuthMessage('github', `error:${error instanceof Error ? error.message : 'Unknown error'}`);
	}
};
