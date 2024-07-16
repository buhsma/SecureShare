<template>
    <button @click="handleDownload">Download</button>
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
        
        let writer;



        let FileChunk;
        //half a day to find a / in front of src/protobuf/ was missing. works jusr fine without it in the bluePortal
        fetch('/src/protobuf/fileChunk.proto')
            .then(response => response.text())
            .then(proto => {
                const root = protobuf.parse(proto).root;

                FileChunk = root.lookupType("fileChunk.FileChunk");
            });

        const fetchData = async (writer) => {
            const key = await revertKey(props.cryptoKey);
            try {
                for (let index = 0; index < totalChunks; index++) {
                    const response = await fetch(`/api/download/${props.id}/${index}`);
                    // console.log('response:', response);
                    const value = await response.arrayBuffer();
                    // console.log('value:', value);
                    const decoded = FileChunk.decode(new Uint8Array(value));
                    // console.log('decoded object:', decoded);

                    const chunk = decoded.chunk;
                    const iv = decoded.iv;

                    // console.log('chunk:', chunk.buffer);
                    // console.log('iv:', iv);
                    // console.log('key:', key);
                
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
            } catch (error) {
                console.error('An error occurred:', error);
            } finally {
                worker.terminate();
                if (writer) {
                    writer.releaseLock();
                }
            }
        };


        const handleDownload = async () => {
            status.value = 'downloading';
            const fileStream = streamSaver.createWriteStream('ScureShare-' + props.fileName);
            writer = fileStream.getWriter();
            await fetchData(writer);
            status.value = 'done';
        };




        return {
            handleDownload
        };
    }
};


</script>