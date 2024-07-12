<template>
    <button @click="handleDownload">Download</button>
</template>

<script>
import { ref } from 'vue';
import streamSaver from 'streamsaver';



export default {
    props: {
        id: String,
        cryptoKey: String,
    },
    setup(props) {
        const worker = new Worker(new URL('@/tools/orangeWorker.js', import.meta.url));
        const status = ref('ready');
        const downloadProgress = ref(0);
        let writer;

        const fetchData = async (writer) => {
            const response = await fetch(`/api/download/${props.id}`);
            const data = await response.json();
            let resolveFetchData;
            const fetchDataPromise = new Promise(resolve => {
                resolveFetchData = resolve;
            });

            worker.onmessage = (event) => {
                if (writer) {
                    const decryptedChunk = new Uint8Array(event.data.decryptedChunk);
                    writer.write(decryptedChunk);
                    if (event.data.index === data.length - 1) {
                        resolveFetchData();
                        writer.close();
                    }
                }
            }

            const revertedKey = await revertKey(props.cryptoKey);
            for (let index = 0; index < data.length; index++) {
                const chunk = data[index];
                worker.postMessage({ chunk: chunk.chunk, iv: chunk.iv, key: revertedKey , index: index });
            }

            await fetchDataPromise;
        };


        const handleDownload = async () => {
            status.value = 'downloading';
            const fileStream = streamSaver.createWriteStream('test.pdf');
            writer = fileStream.getWriter();
            await fetchData(writer);
            status.value = 'done';
        };

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


        return {
            handleDownload
        };
    }
};


</script>