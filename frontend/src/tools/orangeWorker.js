// self.onmessage = async function (event) {
//     const { chunk, key, iv, index} = event.data;
//     const decryptedChunk = await decrypt(chunk, key, iv);
//     self.postMessage({ decryptedChunk, index });
// }

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
  console.log('Worker started', iv, key, chunk)
  const ivArray = iv.split(',').map(Number);
  const ivUint8Array = new Uint8Array(ivArray);
  console.log(typeof ivUint8Array);
  console.log(Array.isArray(ivUint8Array));

  try {
    const importedKey = await crypto.subtle.importKey(
      'jwk',
      key,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    )

    const binaryString = atob(chunk)
    const len = binaryString.length
    const bytes = new Uint8Array(len)
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    const chunkBuffer = bytes.buffer

    const decryptedChunk = await decrypt(chunkBuffer, importedKey, ivUint8Array);
    self.postMessage({ decryptedChunk: decryptedChunk, index }, [decryptedChunk]);
  } catch (error) {
    console.error('Error during decryption:', error)
  }
}
