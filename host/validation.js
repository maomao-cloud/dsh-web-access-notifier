export function normalizePublicOrigin(value) {
  const input = String(value ?? '').trim()
  if (input === '') return ''
  let url
  try {
    url = new URL(input)
  } catch {
    throw new Error('publicOrigin must be a valid URL')
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error('publicOrigin must use http or https')
  if (url.username || url.password) throw new Error('publicOrigin must not contain credentials')
  if (url.search || url.hash) throw new Error('publicOrigin must not contain query or fragment')
  if (url.pathname !== '/' && url.pathname !== '') throw new Error('publicOrigin must not contain a path prefix')
  url.pathname = ''
  url.search = ''
  url.hash = ''
  return url.toString().replace(/\/$/u, '')
}
