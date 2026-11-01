from django.test import TestCase
from rest_framework.test import APIClient

from .models import UploadedDataset


class DatasetDeletionTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.dataset = UploadedDataset.objects.create(
            file_name='sales.csv',
            uploader_name='Sales Operations',
            version=1,
        )

    def test_delete_dataset(self):
        response = self.client.delete(f'/api/data/{self.dataset.pk}/')

        self.assertEqual(response.status_code, 204)
        self.assertFalse(UploadedDataset.objects.filter(pk=self.dataset.pk).exists())

    def test_delete_missing_dataset_returns_not_found(self):
        response = self.client.delete('/api/data/999999/')

        self.assertEqual(response.status_code, 404)

    def test_deleting_latest_dataset_exposes_previous_upload(self):
        latest = UploadedDataset.objects.create(
            file_name='latest.csv',
            uploader_name='Sales Operations',
            version=2,
        )

        response = self.client.delete(f'/api/data/{latest.pk}/')
        status_response = self.client.get('/api/data/status/')

        self.assertEqual(response.status_code, 204)
        self.assertEqual(status_response.data['latest_id'], self.dataset.pk)
