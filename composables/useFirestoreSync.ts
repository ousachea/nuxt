import {
    doc, getDoc, setDoc, onSnapshot
} from 'firebase/firestore'
import { useNuxtApp } from '#app'

const DOC_PATH = { collection: 'tracker', doc: 'artists' }

export function useFirestoreSync() {
    const { $db } = useNuxtApp()

    // Load artists from Firestore, fallback to seed data
    async function loadArtists(fallback: any[]) {
        try {
            const ref = doc($db as any, DOC_PATH.collection, DOC_PATH.doc)
            const snap = await getDoc(ref)
            if (snap.exists() && snap.data()?.artists?.length) {
                return snap.data().artists
            }
            // First run — seed Firestore with default data then return it
            await saveArtists(fallback)
            return fallback
        } catch (e) {
            console.warn('Firestore load failed, using local', e)
            return fallback
        }
    }

    // Save artists array to Firestore
    async function saveArtists(artists: any[]) {
        try {
            const ref = doc($db as any, DOC_PATH.collection, DOC_PATH.doc)
            await setDoc(ref, { artists, updatedAt: new Date() }, { merge: true })
        } catch (e) {
            console.warn('Firestore save failed', e)
        }
    }

    return { loadArtists, saveArtists }
}