import { defineEventHandler, setHeader, readRawBody } from 'h3'

export default defineEventHandler(async (event) => {
    setHeader(event, 'Cache-Control', 'no-store, no-cache')
    setHeader(event, 'Access-Control-Allow-Origin', '*')

    const start = Date.now()

    // Drain the request body without storing it
    const req = event.node.req
    let received = 0

    await new Promise<void>((resolve, reject) => {
        req.on('data', (chunk: Buffer) => { received += chunk.length })
        req.on('end', resolve)
        req.on('error', reject)
    })

    const elapsed = Date.now() - start

    return {
        received, // bytes
        elapsed,  // ms
        mbps: received > 0 && elapsed > 0
            ? +((received * 8) / 1e6 / (elapsed / 1000)).toFixed(2)
            : 0,
    }
})