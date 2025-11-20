/**
 * A CORS proxy Cloudflare Worker. Supports passing credentials (cookies, auth headers).
 *
 * Usage: https://<your-worker-url>/<target-url>
 * Include an X-PROXY-API-KEY header with the correct API key to use the proxy.
 */
export default {
	async fetch(request, env, ctx) {
		const url = new URL(request.url);
		const requestOrigin = request.headers.get('Origin');
		const apiKey = request.headers.get('X-PROXY-API-KEY');

		// Handle CORS preflight (OPTIONS) requests.
		if (request.method === 'OPTIONS') {
			return new Response(null, {
				headers: {
					// Dynamically set the origin to the one that made the request.
					'Access-Control-Allow-Origin': requestOrigin,
					'Access-Control-Allow-Methods': 'GET, HEAD, POST, PUT, DELETE, PATCH, OPTIONS',
					'Access-Control-Max-Age': '86400',
					// Required for credentials.
					'Access-Control-Allow-Credentials': 'true',
					// Reflect back the request headers the browser asked for.
					'Access-Control-Allow-Headers': '*',
				},
			});
		}

		// Handle (invalid) requests with a simple explanation.
		if (url.pathname === '/' || apiKey !== env.PROXY_API_KEY) {
			return new Response('Usage: /<target_url> (X-PROXY-API-KEY header)', { status: 200 });
		}

		// Reconstruct the target URL from the path.
		let targetUrl = url.pathname.substring(1) + url.search;
		if (!targetUrl.match(/^https?:\/\//)) {
			targetUrl = 'https://' + targetUrl;
		}

		try {
			new URL(targetUrl);
		} catch (e) {
			return new Response('Invalid target URL', { status: 400 });
		}

		// Create a new request to the target URL.
		const upstreamRequest = new Request(targetUrl, request);

		// Remove sensitive headers.
		const headersToRemove = [
			'cf-connecting-ip',
			'cf-ipcountry',
			'cf-ray',
			'cf-visitor',
			'cf-worker',
			'x-forwarded-for',
			'x-forwarded-proto',
			'x-real-ip',
			'host',
		];
		for (const header of headersToRemove) {
			upstreamRequest.headers.delete(header);
		}
		// Set the Origin header to match the target's origin.
		upstreamRequest.headers.set('Origin', new URL(targetUrl).origin);

		try {
			// Fetch the response from the target, automatically following redirects.
			const upstreamResponse = await fetch(upstreamRequest, { redirect: 'follow' });

			// Create a new response with the upstream body and properties.
			const response = new Response(upstreamResponse.body, upstreamResponse);

			// Set the final CORS headers with credential support.
			response.headers.set('Access-Control-Allow-Origin', requestOrigin);
			response.headers.set('Access-Control-Allow-Credentials', 'true');
			response.headers.append('Vary', 'Origin');

			response.headers.delete('X-Content-Type-Options');

			return response;
		} catch (error) {
			return new Response('Could not connect to target server', { status: 502 });
		}
	},
};
