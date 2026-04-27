/**
 * Minimal compatibility handler for legacy POST /testClaude route.
 *
 * The original route existed in index.js but no implementation file
 * was present in repository history. Keep behavior bounded and explicit.
 */
export async function handleTestClaude(_request: Request): Promise<Response> {
  return new Response(
    JSON.stringify({
      error: "testClaude endpoint is not implemented in cloud worker"
    }),
    {
      status: 501,
      headers: {
        "Content-Type": "application/json"
      }
    }
  );
}
