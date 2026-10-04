/**
 * tailr-renderer — internal HTTP service.
 *
 *   GET  /health         → { status: "ok" }
 *   POST /pdf  {html, format?}  → application/pdf
 *   POST /png  {html, width?}   → image/png (first screen, for thumbnails)
 *
 * Only reachable inside the compose network; never exposed publicly.
 */
import Fastify from "fastify";
import { closeBrowser, renderPdf, renderPng, type PaperFormat } from "./renderer.js";

const PORT = Number(process.env.PORT ?? 8406);
const MAX_BODY_BYTES = 5 * 1024 * 1024;

const app = Fastify({ logger: { level: process.env.LOG_LEVEL ?? "info" }, bodyLimit: MAX_BODY_BYTES });

interface PdfBody {
  html: string;
  format?: PaperFormat;
}

interface PngBody {
  html: string;
  width?: number;
}

const htmlSchema = { type: "string", minLength: 1, maxLength: MAX_BODY_BYTES };

app.get("/health", async () => ({ status: "ok" }));

app.post<{ Body: PdfBody }>(
  "/pdf",
  {
    schema: {
      body: {
        type: "object",
        required: ["html"],
        properties: { html: htmlSchema, format: { type: "string", enum: ["A4", "Letter"] } },
        additionalProperties: false,
      },
    },
  },
  async (request, reply) => {
    const pdf = await renderPdf(request.body.html, { format: request.body.format });
    return reply.type("application/pdf").send(pdf);
  },
);

app.post<{ Body: PngBody }>(
  "/png",
  {
    schema: {
      body: {
        type: "object",
        required: ["html"],
        properties: { html: htmlSchema, width: { type: "integer", minimum: 200, maximum: 2000 } },
        additionalProperties: false,
      },
    },
  },
  async (request, reply) => {
    const png = await renderPng(request.body.html, { width: request.body.width });
    return reply.type("image/png").send(png);
  },
);

const shutdown = async (): Promise<void> => {
  await app.close();
  await closeBrowser();
  process.exit(0);
};
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

await app.listen({ host: "0.0.0.0", port: PORT });
