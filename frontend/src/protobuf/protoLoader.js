import protobuf from 'protobufjs';

let FileChunk;

fetch('src/protobuf/fileChunk.proto')
    .then(response => response.text())
    .then(proto => {
        const root = protobuf.parse(proto).root;
        FileChunk = root.lookupType("fileChunk.FileChunk");
    });

export default FileChunk;