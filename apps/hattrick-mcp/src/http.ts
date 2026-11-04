import { createServer } from "node:http";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

/**
 * Serves the MCP over Streamable HTTP for hosting as a remote server
 * (stateless: a fresh server+transport per request). Guarded by a bearer
 * token. Mirrors the Go hattrick-mcp's `http` mode.
 *
 * Note: this mode is structured to match the MCP SDK's documented stateless
 * pattern but, like the Go original, is exercised by deployment rather than by
 * unit tests here.
 */
export async function startHttp(
  makeServer: () => McpServer,
  opts: { port?: number; token?: string } = {},
): Promise<void> {
  const port = opts.port ?? Number(process.env.HATTRICK_MCP_ADDR?.replace(/^:/, "")) ?? 8080;
  const token = opts.token ?? process.env.HATTRICK_MCP_TOKEN;
  if (!token) throw new Error("refusing to serve HTTP without HATTRICK_MCP_TOKEN set");

  const server = createServer((req, res) => {
    void (async () => {
      if (req.url === "/healthz") {
        res.writeHead(200).end();
        return;
      }
      if (req.headers.authorization !== `Bearer ${token}`) {
        res.writeHead(401).end("unauthorized");
        return;
      }

      const chunks: Buffer[] = [];
      for await (const chunk of req) chunks.push(chunk as Buffer);
      const body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : undefined;

      const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
      const mcp = makeServer();
      await mcp.connect(transport);
      await transport.handleRequest(req, res, body);
      res.on("close", () => {
        void transport.close();
        void mcp.close();
      });
    })().catch((err) => {
      if (!res.headersSent) res.writeHead(500);
      res.end(String(err instanceof Error ? err.message : err));
    });
  });

  await new Promise<void>((resolve) => server.listen(port, resolve));
  console.error(`hattrick-mcp HTTP server listening on :${port}`);
}
