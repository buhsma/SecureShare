<template>
    <button v-if="status === 'ready'" @click="handleDownload">Download</button>
    <div v-if="status === 'downloading'">
        <progress :value="downloadProgress" max="100"></progress>
    </div>
</template>

<script>
import { ref, onBeforeMount } from 'vue';
import { revertKey } from '@/tools/crypto';
import streamSaver from 'streamsaver';
import protobuf from 'protobufjs';




export default {
    props: {
        id: String,
        cryptoKey: String,
        fileName: String,
        totalChunks: String
    },
    setup(props) {
        const worker = new Worker(new URL('@/tools/orangeWorker.js', import.meta.url));
        const status = ref('ready');
        const downloadProgress = ref(0);
        const totalChunks = Number(props.totalChunks);
        const chunkBuffer = [];
        const chunkBufferMax = 3;

        let writer;



        let FileChunk;
        //half a day to find a / in front of src/protobuf/ was missing. works jusr fine without it in the bluePortal
        fetch('/src/protobuf/fileChunk.proto')
            .then(response => response.text())
            .then(proto => {
                const root = protobuf.parse(proto).root;

                FileChunk = root.lookupType("fileChunk.FileChunk");
            });
        const processChunkBuffer = async (key) => {
            while (status.value === 'downloading' || chunkBuffer.length > 0) {
                if (chunkBuffer.length === 0) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                    continue;
                }
                const { index, chunk, iv } = chunkBuffer.shift();
                worker.postMessage({
                    chunk: chunk,
                    iv: iv,
                    key: key,
                    index: index
                });
                await new Promise(resolve => {
                    worker.onmessage = (event) => {
                        if (writer) {
                            const decryptedChunk = new Uint8Array(event.data.decryptedChunk);
                            writer.write(decryptedChunk);
                            downloadProgress.value = (index + 1) / totalChunks * 100;
                            if (index === totalChunks - 1) {
                                writer.close();
                            }
                        }
                        resolve();
                    }
                });
            }
        };
        const fetchData = async () => {
            for (let index = 0; index < totalChunks; index++) {
                let retryCount = 0;
                while (retryCount < 3) {
                    try {
                        const response = await fetch(`/api/download/${props.id}/${index}`);
                        const value = await response.arrayBuffer();
                        const decoded = FileChunk.decode(new Uint8Array(value));
                        chunkBuffer.push({ index: index, chunk: decoded.chunk, iv: decoded.iv });

                        while (chunkBuffer.length >= chunkBufferMax) {
                            await new Promise(resolve => setTimeout(resolve, 100));
                        }
                        
                        break;
                    } catch (error) {
                        console.error('An error occurred:', error);
                        retryCount++;
                        if (retryCount >= 3) {
                            throw new Error(`Failed to fetch chunk ${index} after 3 attempts`);
                        }
                    }
                }
            }
        };

        const handleDownload = async () => {
            status.value = 'downloading';
            const key = await revertKey(props.cryptoKey);
            const fileStream = streamSaver.createWriteStream('ScureShare-' + props.fileName);
            writer = fileStream.getWriter();
            fetchData(writer);
            await processChunkBuffer(key);
            worker.terminate();
            if (writer) {
                writer.releaseLock();
            }
            status.value = 'done';
        };

        return {
            handleDownload,
            status,
            downloadProgress
        };
    }
};

</script>