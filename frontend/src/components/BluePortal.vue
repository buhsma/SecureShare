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
import { getKey, convertKey } from '@/tools/crypto';
import protobuf from 'protobufjs';


export default {
    setup() {
        const maxSimultaneousUploads = 15;
        const chunkSizeMB = 1;
        const status = ref('input');
        const id = ref(uuidv4());
        const link = ref('');
        const uploadQueue = ref([]);
        const uploadProgress = ref(0);
        const encryptProgress = ref(0);
        const worker = new Worker(new URL('@/tools/blueWorker.js', import.meta.url));

        // Load the .proto file
        let FileChunk;

        fetch('src/protobuf/fileChunk.proto')
            .then(response => response.text())
            .then(proto => {
                const root = protobuf.parse(proto).root;

                FileChunk = root.lookupType("fileChunk.FileChunk");
            });

        let chunksUploaded = 0;
        let chunksEncrypted = 0;

        const handleFileUpload = async (event) => {
            status.value = 'uploading';
            const file = event.target.files[0];
            const fileName = file.name;
            const chunkSize = 1024 * 1024 * chunkSizeMB;
            const totalChunks = Math.ceil(file.size / chunkSize);
            const key = await getKey();
            const urlSaveKey = await convertKey(key);
            link.value = `http://localhost:5173/download/${id.value}/${urlSaveKey}/${fileName}/${totalChunks}`;

            worker.onmessage = async (event) => {
                console.log('encrypted chunk', event.data.index);
                const encryptedChunk = event.data;
                chunksEncrypted++;
                encryptProgress.value = (chunksEncrypted / totalChunks) * 100;

                // Create a new FileChunk message
                let message = FileChunk.create({
                    chunk: encryptedChunk.chunk,
                    iv: encryptedChunk.iv
                });

                // Encode the message to a Buffer
                let buffer = FileChunk.encode(message).finish();

                // Add the buffer to the upload queue
                uploadQueue.value.push(buffer);

                while (uploadQueue.value.length > 0) {
                    const nextChunk = uploadQueue.value.shift();
                    try {
                        await uploadChunk(nextChunk, id.value, encryptedChunk.index);
                    } catch (error) {
                        console.error(`failed to upload chunk ${error}`);
                        // handle error, e.g. by retrying the upload
                    }
                }
                if (chunksUploaded === totalChunks) {
                    console.log('All chunks uploaded');
                    worker.terminate();
                    status.value = 'done';

                }
            }
            let index = 0;
            for (let start = 0; start < file.size; start += chunkSize, index++) {
                console.log('encrypting chunk', index);
                const chunk = file.slice(start, start + chunkSize);
                const iv = crypto.getRandomValues(new Uint8Array(12));

                while (chunksEncrypted > chunksUploaded + maxSimultaneousUploads * 2) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }

                worker.postMessage({
                    index,
                    chunk,
                    key,
                    iv
                });
            }
        }

        const uploadChunk = async (buffer, id, index) => {
            try {
                await axios.post(`http://localhost:8000/api/upload/`, buffer, {
                    headers: {
                        'Content-Type': 'application/octet-stream',
                        'id': id,
                        'index': index
                    },
                    responseType: 'arraybuffer'
                });

                chunksUploaded++;
                uploadProgress.value = (chunksUploaded / totalChunks) * 100;
            } catch (error) {
                throw error;
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