import { cp, mkdir, readdir, rm, writeFile } from "node:fs/promises";

await mkdir("dist/server", { recursive: true });
await mkdir("dist/.openai", { recursive: true });

await writeFile(
  "dist/server/index.js",
  `export default {
  async fetch(request, env) {
    const response = await env.ASSETS.fetch(request);
    if (response.status !== 404) return response;
    return env.ASSETS.fetch(new Request(new URL("/index.html", request.url), request));
  }
};
`,
);

await cp(".openai/hosting.json", "dist/.openai/hosting.json");

for (const file of await readdir("dist/images")) {
  if (file.endsWith(".png")) await rm(`dist/images/${file}`);
}
