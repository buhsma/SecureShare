<template>
    <button @click="handleDownload">Download</button>
</template>

<script>
import { ref } from 'vue';
import { revertKey } from '@/tools/crypto';
import streamSaver from 'streamsaver';



export default {
    props: {
        id: String,
        cryptoKey: String,
        fileName: String,
        totalChunks: Number
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