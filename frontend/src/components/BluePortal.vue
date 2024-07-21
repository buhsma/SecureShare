<template>
    <h1>BluePortal</h1>
    <input v-if="status === 'input'" type="file" @change="handleFileUpload">
    <div v-else-if="status === 'uploading'">
        <progress :value="encryptProgress" max="100"></progress>
        <progress :value="isNaN(uploadProgress) ? 0 : uploadProgress" max="100"></progress>
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
// import FileChunk from '@/protobuf/protoLoader';


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
        //just for development
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

            const file = event.target.files[0];
            const fileName = file.name;
            const chunkSize = 1024 * 1024 * chunkSizeMB;
            const totalChunks = Math.ceil(file.size / chunkSize);
            const key = await getKey();
            const urlSaveKey = await convertKey(key);

            //var in env
            link.value = `http://localhost:5173/download/${id.value}/${urlSaveKey}/${fileName}/${totalChunks}`;
            status.value = 'uploading';

            let ongoingUploads = 0;
            const maxSimultaneousUploads = 5;

            worker.onmessage = async (event) => {
                const encryptedChunk = event.data;
                chunksEncrypted++;
                encryptProgress.value = (chunksEncrypted / totalChunks) * 100;

                let message = FileChunk.create({
                    chunk: new Uint8Array(encryptedChunk.chunk),
                    iv: encryptedChunk.iv
                });

                let buffer = FileChunk.encode(message).finish();

                uploadQueue.value.push({ buffer, index: encryptedChunk.index });

                if (ongoingUploads < maxSimultaneousUploads) {
                    uploadNextChunk();
                }
            }

            async function uploadNextChunk() {
                if (uploadQueue.value.length === 0) {
                    return;
                }

                ongoingUploads++;
                const { buffer, index } = uploadQueue.value.shift();
                try {
                    await uploadChunk(buffer, id.value, index, totalChunks);
                } catch (error) {
                    console.error(`failed to upload chunk ${error}`);
                } finally {
                    ongoingUploads--;
                    if (uploadQueue.value.length > 0) {
                        uploadNextChunk();
                    }
                }
            }

            let index = 0;
            for (let start = 0; start < file.size; start += chunkSize, index++) {
                const chunk = file.slice(start, start + chunkSize);
                const iv = crypto.getRandomValues(new Uint8Array(12));

                while (index > chunksUploaded + (maxSimultaneousUploads * 2)) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }

                worker.postMessage({
                    index,
                    chunk: chunk,
                    key,
                    iv
                });
            }
        }

        const uploadChunk = async (buffer, id, index, totalChunks, retryCount = 0) => {
            try {
                await axios.post(`http://localhost:8000/api/upload/`, buffer, {
                    headers: {
                        'Content-Type': 'application/octet-stream',
                        'id': id,
                        'index': index,
                    },
                    responseType: 'arraybuffer'
                });

                chunksUploaded++;
                uploadProgress.value = (chunksUploaded / totalChunks) * 100;
                buffer = null;
                if (chunksUploaded === totalChunks) {
                    console.log('All chunks uploaded');
                    worker.terminate();
                    status.value = 'done';

                }
            } catch (error) {
                console.error(`failed to upload chunk ${error}`);
                if (retryCount < 3) {
                    console.log(`retrying upload... attempt ${retryCount + 1}`);
                    await uploadChunk(buffer, id, index, totalChunks, retryCount + 1);
                } else {
                    console.error(`upload of chunk ${index} failed after 3 attempts`);
                    throw error;
                }
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