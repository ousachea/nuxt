import { getQuery } from 'h3'

export default defineEventHandler((event) => {
    // Client passes ?mb=5 or ?mb=20 depending on connection type
    const query = getQuery(event)
    const mbParam = Number(query.mb)
    const MB = Number.isFinite(mbParam) && mbParam > 0 && mbParam <= 50
        ? mbParam
        : 20                          // default 20 MB for WiFi
    const TOTAL = MB * 1024 * 1024
    const CHUNK = 64 * 1024      // 64 KB chunks

    setResponseHeaders(event, {
        'Content-Type': 'application/octet-stream',
        'Content-Length': String(TOTAL),
        'Cache-Control': 'no-store, no-cache',
    })

    const res = event.node.res
    const chunk = Buffer.alloc(CHUNK)
    let sent = 0

    return new Promise<void>((resolve, reject) => {
        function write() {
            let ok = true
            while (sent < TOTAL && ok) {
                const size = Math.min(CHUNK, TOTAL - sent)
                const slice = chunk.subarray(0, size)
                sent += size
                if (sent >= TOTAL) {
                    res.end(slice, resolve as () => void)
                    return
                }
                ok = res.write(slice)
            }
            if (!ok) res.once('drain', write)
        }
        res.on('error', reject)
        write()
    })
})