async function decrypt(chunk, key, iv) {
  console.log('start decrypting')
  const decryptedChunk = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv
    },
    key,
    chunk
  )
  console.log('done decrypting')
  return decryptedChunk
}

self.onmessage = async function (event) {
  const { chunk, key, iv, index } = event.data
  const ivUint8Array = new Uint8Array(iv);
  try {
    const importedKey = await crypto.subtle.importKey(
      'jwk',
      key,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    )
    const decryptedChunk = await decrypt(chunk, importedKey, ivUint8Array);
    self.postMessage({ decryptedChunk: decryptedChunk, index }, [decryptedChunk]);
  } catch (error) {
    console.error('Error during decryption:', error)
  }
}
