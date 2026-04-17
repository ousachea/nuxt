import { defineEventHandler, setHeader } from 'h3'

export default defineEventHandler((event) => {
    setHeader(event, 'Cache-Control', 'no-store, no-cache')
    setHeader(event, 'Access-Control-Allow-Origin', '*')
    return { ok: true, ts: Date.now() }
})