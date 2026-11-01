from django.urls import path
from .views import (
    UploadExcelView,
    LatestDatasetView,
    DatasetStatusView,
    DatasetHistoryView,
    DatasetDetailView,
    DownloadSampleView
)

urlpatterns = [
    path('upload/', UploadExcelView.as_view(), name='excel-upload'),
    path('data/latest/', LatestDatasetView.as_view(), name='dataset-latest'),
    path('data/status/', DatasetStatusView.as_view(), name='dataset-status'),
    path('data/history/', DatasetHistoryView.as_view(), name='dataset-history'),
    path('data/<int:pk>/', DatasetDetailView.as_view(), name='dataset-detail'),
    path('sample-template/', DownloadSampleView.as_view(), name='sample-template'),
]
