export default {
  async fetch(request, env, ctx) {
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
      // 3. Forward the exact request to the target server
      const targetRequest = new Request(targetUrl, {
        method: request.method,
        // Clone headers but remove host and origin to avoid target server rejecting it
        headers: new Headers(request.headers),
        body: request.body,
        redirect: "follow"
      });
      
      targetRequest.headers.delete("Origin");
      targetRequest.headers.delete("Host");
      targetRequest.headers.delete("Referer");

      const response = await fetch(targetRequest);

      // 4. Send the response back to the client, adding CORS headers
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
};
