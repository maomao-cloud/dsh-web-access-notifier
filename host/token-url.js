export function buildAuthenticatedUrl(authenticatedUrl, publicOrigin) {
  const sourceUrl = new URL(authenticatedUrl)
  const token = sourceUrl.searchParams.get('token')
  if (!token) throw new Error('DSH authenticated URL does not contain token')
  const origin = new URL(publicOrigin)
  origin.search = ''
  origin.hash = ''
  origin.pathname = ''
  origin.searchParams.set('token', token)
  return { url: origin.toString(), tokenLength: token.length }
}

export function tokenLengthOf(authenticatedUrl) {
  const token = new URL(authenticatedUrl).searchParams.get('token')
  if (!token) throw new Error('DSH authenticated URL does not contain token')
  return token.length
}
