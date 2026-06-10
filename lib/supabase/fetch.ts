export const supabaseFetch: typeof fetch = async (input, init) => {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 4000)

  try {
    return await fetch(input, {
      ...init,
      signal: init?.signal ?? controller.signal,
    })
  } finally {
    clearTimeout(timeout)
  }
}
