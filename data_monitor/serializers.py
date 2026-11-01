from rest_framework import serializers
from .models import UploadedDataset

class UploadedDatasetSummarySerializer(serializers.ModelSerializer):
    """Lightweight serializer for dataset history and status checks."""
    class Meta:
        model = UploadedDataset
        fields = [
            'id',
            'file_name',
            'uploaded_at',
            'uploader_name',
            'file_size_bytes',
            'version',
            'total_rows',
            'total_columns',
            'sheet_names',
            'active_sheet'
        ]

class UploadedDatasetDetailSerializer(serializers.ModelSerializer):
    """Full detail serializer including table rows, sheets, and statistics."""
    class Meta:
        model = UploadedDataset
        fields = [
            'id',
            'file_name',
            'uploaded_at',
            'uploader_name',
            'file_size_bytes',
            'version',
            'sheet_names',
            'active_sheet',
            'headers',
            'rows_data',
            'all_sheets_data',
            'total_rows',
            'total_columns',
            'summary_stats'
        ]
