import { env, createExecutionContext, waitOnExecutionContext, SELF } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';
import worker from '../src';

describe('Proxy worker', () => {
	it('responds with example (unit style)', async () => {
		const headers = { 'X-PROXY-API-KEY': env.PROXY_API_KEY };
		const request = new Request('http://localhost/example.com', { headers });
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);

		// Wait for all `Promise`s passed to `ctx.waitUntil()` to settle before running test assertions
		await waitOnExecutionContext(ctx);
		const responseText = await response.text();
		expect(responseText).toContain('Example');
	});

	it('responds with example (unit style)', async () => {
		const headers = { 'X-PROXY-API-KEY': env.PROXY_API_KEY };
		const request = new Request('http://localhost/https://jsonplaceholder.typicode.com/comments?postId=1', { headers });
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);

		// Wait for all `Promise`s passed to `ctx.waitUntil()` to settle before running test assertions
		await waitOnExecutionContext(ctx);
		const responseJson = await response.json();
		expect(responseJson[0].postId).toBe(1);
	});
});
