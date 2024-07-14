const getKey = async () => {
    const key = await crypto.subtle.generateKey(
        {
            name: "AES-GCM",
            length: 256
        },
        true,
        ["encrypt", "decrypt"]
    );
    return key;
}

const convertKey = async (key) => {
    const rawKey = await crypto.subtle.exportKey('raw', key);
    const arrayBufferToUrlSafeBase64 = (buffer) => {
        const binary = Array.prototype.map.call(new Uint8Array(buffer), byte => String.fromCharCode(byte)).join('');
        const base64 = window.btoa(binary);
        return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }


    const urlSafeKey = arrayBufferToUrlSafeBase64(rawKey);
    return urlSafeKey;
}

const revertKey = async (urlSafeKey) => {
    const base64Key = urlSafeKey.replace(/-/g, '+').replace(/_/g, '/');
    const padding = '='.repeat((4 - base64Key.length % 4) % 4);
    const completeBase64Key = base64Key + padding;

    const base64ToArrayBuffer = (completeBase64Key) => {
        const binary = window.atob(completeBase64Key);
        const length = binary.length;
        const buffer = new ArrayBuffer(length);
        const view = new Uint8Array(buffer);
        for (let i = 0; i < length; i++) {
            view[i] = binary.charCodeAt(i);
        }
        return buffer;
    }

    const rawKey = base64ToArrayBuffer(completeBase64Key);
    const key = await crypto.subtle.importKey('raw', rawKey, { name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
    const exportedKey = await crypto.subtle.exportKey("jwk", key);
    console.log(exportedKey);

    return exportedKey;
}

export { getKey, convertKey, revertKey };