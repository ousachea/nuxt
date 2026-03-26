export function normalizeArtists(artists) {
    return artists.map(a => {
      const normalize = (list) => {
        return (list || [])
          .filter(w => {
            const code = typeof w === 'string' ? w : w.code
            return code && code.trim() !== ''
          })
          .map(w => typeof w === 'string' ? { code: w.trim(), addedAt: 0 } : w)
      }
      return {
        name: a.name || '',
        cover: a.cover || '',
        url: a.url || '',
        mainWorks: normalize(a.mainWorks),
        compilations: normalize(a.compilations)
      }
    })
  }