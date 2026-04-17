export default defineEventHandler((event) => {
    setResponseHeaders(event, {
        'Cache-Control': 'no-store, no-cache',
        'Content-Type': 'application/json',
    })

    const req = event.node.req
    const start = Date.now()
    let received = 0

    return new Promise<{ received: number; elapsed: number; mbps: number }>((resolve, reject) => {
        req.on('data', (chunk: Buffer) => { received += chunk.length })
        req.on('end', () => {
            const elapsed = Date.now() - start
            resolve({
                received,
                elapsed,
                mbps: received > 0 && elapsed > 0
                    ? +((received * 8) / 1e6 / (elapsed / 1000)).toFixed(2)
                    : 0,
            })
        })
        req.on('error', reject)
    })
})