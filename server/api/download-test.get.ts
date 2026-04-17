import { defineEventHandler, setHeader } from 'h3'

// 20 MB payload — large enough to get a stable reading even on fast connections
const PAYLOAD_SIZE = 20 * 1024 * 1024
const CHUNK_SIZE = 64 * 1024 // 64 KB chunks

export default defineEventHandler(async (event) => {
    setHeader(event, 'Content-Type', 'application/octet-stream')
    setHeader(event, 'Content-Length', PAYLOAD_SIZE.toString())
    setHeader(event, 'Cache-Control', 'no-store, no-cache')
    setHeader(event, 'Access-Control-Allow-Origin', '*')

    // Stream in chunks so memory stays low
    const stream = new ReadableStream({
        start(controller) {
            let sent = 0
            function push() {
                while (sent < PAYLOAD_SIZE) {
                    const remaining = PAYLOAD_SIZE - sent
                    const size = Math.min(CHUNK_SIZE, remaining)
                    const chunk = Buffer.alloc(size)
                    controller.enqueue(chunk)
                    sent += size
                }
                controller.close()
            }
            push()
        },
    })

    return sendStream(event, stream)
})

// h3 helper
function sendStream(event: any, stream: ReadableStream) {
    const res = event.node.res
    res.writeHead(200, {
        'Content-Type': 'application/octet-stream',
        'Content-Length': PAYLOAD_SIZE,
        'Cache-Control': 'no-store',
    })
    const reader = stream.getReader()
    return new Promise<void>((resolve, reject) => {
        function pump() {
            reader.read().then(({ done, value }) => {
                if (done) { res.end(); return resolve() }
                res.write(Buffer.from(value), (err: any) => {
                    if (err) return reject(err)
                    pump()
                })
            }).catch(reject)
        }
        pump()
    })
}