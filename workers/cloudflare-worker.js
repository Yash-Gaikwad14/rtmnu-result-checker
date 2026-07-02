// RTMNU CORS Proxy Worker
// Paste this into the Cloudflare Workers dashboard editor and click "Save & Deploy"
// No build step or wrangler needed.

addEventListener("fetch", event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  // 1. Handle CORS Preflight (OPTIONS) requests
  if (request.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Max-Age": "86400",
      }
    });
  }

  // 2. Get the target URL from the "?url=" query parameter
  const url = new URL(request.url);
  const targetUrl = url.searchParams.get("url");

  if (!targetUrl) {
    return new Response("Missing 'url' parameter. Example usage: ?url=https://example.com", {
      status: 400,
      headers: { "Access-Control-Allow-Origin": "*" }
    });
  }

  try {
    // 3. Forward the request to the target server
    const headers = new Headers(request.headers);
    headers.delete("Origin");
    headers.delete("Host");
    headers.delete("Referer");

    const targetRequest = new Request(targetUrl, {
      method: request.method,
      headers: headers,
      body: request.body,
      redirect: "follow"
    });

    const response = await fetch(targetRequest);

    // 4. Return the response with CORS headers added
    const corsResponse = new Response(response.body, response);
    corsResponse.headers.set("Access-Control-Allow-Origin", "*");
    corsResponse.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    corsResponse.headers.set("Access-Control-Allow-Headers", "*");

    return corsResponse;
  } catch (e) {
    return new Response("Proxy Error: " + e.message, {
      status: 500,
      headers: { "Access-Control-Allow-Origin": "*" }
    });
  }
}
