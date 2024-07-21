// let queue = [];
// let isProcessing = false;

// const processQueue = async () => {
//     if (queue.length === 0) {
//         isProcessing = false;
//         return;
//     }

//     isProcessing = true;
//     const { index, chunk, key, iv } = queue.shift();
//     console.log('Worker started', index);
//     const reader = new FileReader();
//     const arrayBuffer = await new Promise((resolve) => {
//         reader.onload = function () {
//             resolve(this.result);
//         }
//         reader.readAsArrayBuffer(chunk);
//     });
//     const encryptedChunk = await self.crypto.subtle.encrypt(
//         {
//             name: 'AES-GCM',
//             iv
//         },
//         key,
//         arrayBuffer
//     );
//     self.postMessage({ index, chunk: encryptedChunk, iv });
//     processQueue();
// };

// self.onmessage = ({ data }) => {
//     queue.push(data);
//     if (!isProcessing) {
//         processQueue();
//     }
// };

self.onmessage = async ({ data }) => {
    const { index, chunk, key, iv } = data;
    console.log('Worker started', index);
    const reader = new FileReader();
    const arrayBuffer = await new Promise((resolve) => {
        reader.onload = function () {
            resolve(this.result);
        }
        reader.readAsArrayBuffer(chunk);
    });
    const encryptedChunk = await self.crypto.subtle.encrypt(
        {
            name: 'AES-GCM',
            iv
        },
        key,
        arrayBuffer
    );
    self.postMessage({ index, chunk: encryptedChunk, iv });
};