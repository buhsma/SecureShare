from django.conf import settings
import os
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from .models import FileChunk
import base64
from django.http import JsonResponse

@api_view(["POST"])
@permission_classes([AllowAny])
def handleFileUpload(request):
    id = request.data.get("id")
    chunk = request.FILES.get("chunk")
    index = request.data.get("index")
    iv = request.data.get("iv")

    print(request.data)

    if id is None or chunk is None or index is None or iv is None:
        return Response ({"error": "Failed to upload chunk"}, status=400)
    else:
        fileDir = os.path.join(settings.STORAGE_ROOT, id)
        if not os.path.exists(fileDir):
            os.makedirs(fileDir)
        
        chunkPath = os.path.join(fileDir, index)
        with open(chunkPath, "wb") as f:
            f.write(chunk.read())

        FileChunk.objects.create(file_id=id, index=index, iv=iv)

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
                "iv": chunk.iv,
                "index": chunk.index
            })
    return data

@api_view(["GET"])
@permission_classes([AllowAny])
def handleFileDownload(request, id):
    if id is None:
        return Response({"error": "Failed to download file"}, status=400)
    else:
        fileDir = os.path.join(settings.STORAGE_ROOT, id)
        if not os.path.exists(fileDir):
            return Response({"error": "File not found"}, status=404)
        else:
            chunks = FileChunk.objects.filter(file_id=id).order_by("index")
            if len(chunks) == 0:
                return Response({"error": "File not found"}, status=404)
            else:
                data = collect_file_data(fileDir, chunks)
                return JsonResponse(data, safe=False)
        

