from django.conf import settings
import os
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from .models import FileChunk
import base64
from django.http import JsonResponse
from rest_framework.decorators import parser_classes
from .parser import OctetStreamParser

@api_view(["POST"])
@permission_classes([AllowAny])
@parser_classes([OctetStreamParser])
def handleFileUpload(request):
    id = request.META.get("HTTP_ID")
    index = request.META.get("HTTP_INDEX")
    chunk = request.body
    

    print("id: ", id)
    print("index: ", index)
    # print("chunk: ", chunk)

    if id is None or chunk is None or index is None:
        return Response ({"error": "Failed to upload chunk"}, status=400)
    else:
        fileDir = os.path.join(settings.STORAGE_ROOT, id)
        if not os.path.exists(fileDir):
            os.makedirs(fileDir)
        print("file size: ", len(chunk))
        chunkPath = os.path.join(fileDir, index)
        with open(chunkPath, "wb") as f:
            f.write(chunk)

        FileChunk.objects.create(file_id=id, index=index)

        return Response({"status": "Chunk uploaded"}, status=200)
    



def collect_file_data(fileDir, chunks):
    data = []
    for chunk in chunks:
        chunkPath = os.path.join(fileDir, str(chunk.index))
        with open(chunkPath, "rb") as f:
            chunk_data = f.read()
            base64_chunk = base64.b64encode(chunk_data).decode('utf-8')
            data.append({
                "chunk": base64_chunk,
                "index": chunk.index
            })
    return data

from django.http import FileResponse

@api_view(["GET"])
@permission_classes([AllowAny])
def handleFileDownload(request, id, index):
    if id is None:
        return Response({"error": "Failed to download file"}, status=400)
    else:
        fileDir = os.path.join(settings.STORAGE_ROOT, id)
        chunkPath = os.path.join(fileDir, str(index))
        if not os.path.exists(chunkPath):
            return Response({"error": "File not found"}, status=404)
        else:
            print("fileDir: ", fileDir)
            print("chunkPath: ", chunkPath)
            print("first 10 bytes: ", open(chunkPath, 'rb').read(10))
            print("file size: ", os.path.getsize(chunkPath))
            return FileResponse(open(chunkPath, 'rb'), content_type='application/octet-stream')
        

