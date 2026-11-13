// Downloads the OpenAPI documents of both APIs into openapi/, the versioned copies the client types
// are generated from. Defaults to the public demos; point at local services with the env vars.
//   SCHEDULING_API_URL=http://localhost:8180 WEBHOOK_RELAY_URL=http://localhost:3100 npm run api:download
import { writeFile } from 'node:fs/promises'

const sources = [
  {
    file: 'openapi/scheduling.json',
    url: `${process.env.SCHEDULING_API_URL ?? 'https://scheduling-api-gf47.onrender.com'}/openapi/v1.json`,
  },
  {
    file: 'openapi/webhook-relay.json',
    url: `${process.env.WEBHOOK_RELAY_URL ?? 'https://webhook-relay-1odf.onrender.com'}/openapi.json`,
  },
]

for (const { file, url } of sources) {
  // Free Render services sleep; the first request can take ~50 s while they wake up.
  const response = await fetch(url, { signal: AbortSignal.timeout(120_000) })
  if (!response.ok) throw new Error(`${url} answered ${response.status}`)
  const document = await response.json()
  // `servers` depends on the host that served the document; drop it so local and demo copies compare equal.
  delete document.servers
  await writeFile(file, `${JSON.stringify(document, null, 2)}\n`)
  console.info(`${file} <- ${url}`)
}
