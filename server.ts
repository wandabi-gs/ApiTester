import express from "express";
import path from "node:path";

interface ProxyRequestBody {
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: string;
}

const app = express();
app.use(express.json({ limit: "5mb" }));
app.use(express.static(path.join(__dirname, "public")));

app.post("/api/proxy", async (req, res) => {
  const { method, url, headers, body } = req.body as ProxyRequestBody;

  if (!method || !url) {
    res.status(400).json({ error: "method and url are required" });
    return;
  }

  try {
    const start = Date.now();
    const init: RequestInit = { method, headers };
    const hasBody = !["GET", "HEAD"].includes(method.toUpperCase());
    if (hasBody && body) init.body = body;

    const upstream = await fetch(url, init);
    const text = await upstream.text();
    const elapsedMs = Date.now() - start;

    const responseHeaders: Record<string, string> = {};
    upstream.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    res.json({
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders,
      body: text,
      elapsedMs,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(502).json({ error: message });
  }
});

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
app.listen(PORT, () => {
  console.log(`NCBA API tester running at http://localhost:${PORT}`);
});
