from django.db import models

class FileChunk(models.Model):
    file_id = models.CharField(max_length=255)
    index = models.IntegerField()
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'chunks'
        unique_together = ('file_id', 'index')