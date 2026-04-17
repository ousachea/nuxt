export default defineEventHandler((event) => {
    setResponseHeaders(event, {
        'Cache-Control': 'no-store, no-cache',
        'Content-Type': 'application/json',
    })
    return { ok: true, ts: Date.now() }
})