<template>
    <h1>BluePortal</h1>
    <input v-if="status === 'input'" type="file" @change="handleFileUpload">
    <div v-else-if="status === 'uploading'">
        <progress :value="encryptProgress" max="100"></progress>
        <progress :value="uploadProgress" max="100"></progress>
    </div>
    <div v-else-if="status === 'done'">
        <a :href="link">Download</a>
    </div>
</template>

<script>

import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import { ref } from 'vue';



export default {
    setup() {
        const maxSimultaneousUploads = 3;
        const chunkSizeMB = 1;
        const status = ref('input');
        const id = ref(uuidv4());
        const link = ref('');
        const uploadQueue = ref([]);
        const isUploading = ref(0);
        const uploadProgress = ref(0);
        const encryptProgress = ref(0);
        const worker = new Worker(new URL('@/tools/blueWorker.js', import.meta.url));


        let chunksUploaded = 0;
        let chunksEncrypted = 0;

        const uploadChunk = async (chunk, iv, index, totalChunks) => {
            isUploading.value++;
            let blob = new Blob([chunk], { type: 'application/octet-stream' });
            const formData = new FormData();
            formData.append('id', id.value);
            formData.append('index', index);
            formData.append('chunk', blob);
            formData.append('iv', iv);
            console.log('uploading chunk', index);
            axios.post('http://localhost:8000/api/upload/', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            }).then(() => {
                chunksUploaded++;
                uploadProgress.value = (chunksUploaded / totalChunks) * 100;

                if (uploadQueue.value.length > 0) {
                    const nextChunk = uploadQueue.value.shift();
                    uploadChunk(nextChunk.chunk, nextChunk.iv , nextChunk.index, totalChunks);
                } else {
                    isUploading.value--;
                    if (isUploading.value === 0 && uploadQueue.value.length === 0) {
                        worker.terminate();
                        status.value = 'done';
                    }
                }
            });
        }

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

        const handleFileUpload = async (event) => {
            status.value = 'uploading';
            const file = event.target.files[0];
            const chunkSize = 1024 * 1024 * chunkSizeMB;
            const totalChunks = Math.ceil(file.size / chunkSize);
            const key = await getKey();
            const urlSaveKey = await convertKey(key);
            link.value = `http://localhost:5173/download/${id.value}/${urlSaveKey}`;

            worker.onmessage = async (event) => {
                console.log('encrypted chunk', event.data.index);
                const encryptedChunk = event.data;
                uploadQueue.value.push({
                    chunk: encryptedChunk.chunk,
                    iv: encryptedChunk.iv,
                    index: encryptedChunk.index
                });
                chunksEncrypted++;
                encryptProgress.value = (chunksEncrypted / totalChunks) * 100;
                if (isUploading.value < maxSimultaneousUploads) {
                    const nextChunk = uploadQueue.value.shift();
                    await uploadChunk(nextChunk.chunk, nextChunk.iv, nextChunk.index, totalChunks);
                }
            }
            let index = 0;
            for (let start = 0; start < file.size; start += chunkSize, index++) {
                console.log('encrypting chunk', index);
                const chunk = file.slice(start, start + chunkSize);
                const iv = crypto.getRandomValues(new Uint8Array(12));

                worker.postMessage({
                    index,
                    chunk,
                    key,
                    iv
                });
            }
        }
        return {
            handleFileUpload,
            uploadProgress,
            encryptProgress,
            status,
            link
        }
    }
}

</script>