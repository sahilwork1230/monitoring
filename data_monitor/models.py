from django.db import models
import os

class UploadedDataset(models.Model):
    file_name = models.CharField(max_length=255)
    file = models.FileField(upload_to='excel_uploads/', null=True, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    uploader_name = models.CharField(max_length=100, default='Sales Manager')
    file_size_bytes = models.BigIntegerField(default=0)
    version = models.IntegerField(default=1)
    
    # Excel multi-sheet support
    sheet_names = models.JSONField(default=list)
    active_sheet = models.CharField(max_length=255, blank=True, default='')
    
    # Tabular structure: headers and rows
    headers = models.JSONField(default=list)
    rows_data = models.JSONField(default=list)
    all_sheets_data = models.JSONField(default=dict, blank=True)
    
    # Summary metrics
    total_rows = models.IntegerField(default=0)
    total_columns = models.IntegerField(default=0)
    summary_stats = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ['-uploaded_at']

    def __str__(self):
        return f"{self.file_name} (v{self.version}) - {self.uploaded_at.strftime('%Y-%m-%d %H:%M:%S')}"
