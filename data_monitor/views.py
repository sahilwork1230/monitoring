import io
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from django.http import HttpResponse
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser

from .models import UploadedDataset
from .serializers import UploadedDatasetSummarySerializer, UploadedDatasetDetailSerializer
from .excel_parser import parse_uploaded_file

class UploadExcelView(APIView):
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, *args, **kwargs):
        if 'file' not in request.FILES:
            return Response(
                {'error': 'No file provided. Please attach an Excel (.xlsx, .xls) or .csv file.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        uploaded_file = request.FILES['file']
        uploader_name = request.data.get('uploader_name', 'Sales Manager').strip() or 'Sales Manager'
        
        # Validate extension
        filename = uploaded_file.name
        valid_extensions = ('.xlsx', '.xls', '.csv', '.xlsm')
        if not any(filename.lower().endswith(ext) for ext in valid_extensions):
            return Response(
                {'error': f'Invalid file type. Supported formats are: {", ".join(valid_extensions)}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Parse file
            parsed_data = parse_uploaded_file(uploaded_file, filename)
            
            # Determine next version number
            latest = UploadedDataset.objects.order_by('-version').first()
            next_version = (latest.version + 1) if latest else 1

            # Reset file pointer to save to model
            uploaded_file.seek(0)

            dataset = UploadedDataset.objects.create(
                file_name=filename,
                file=uploaded_file,
                uploader_name=uploader_name,
                file_size_bytes=uploaded_file.size,
                version=next_version,
                sheet_names=parsed_data['sheet_names'],
                active_sheet=parsed_data['active_sheet'],
                headers=parsed_data['headers'],
                rows_data=parsed_data['rows_data'],
                all_sheets_data=parsed_data['all_sheets_data'],
                total_rows=parsed_data['total_rows'],
                total_columns=parsed_data['total_columns'],
                summary_stats=parsed_data['summary_stats'],
            )

            serializer = UploadedDatasetDetailSerializer(dataset)
            return Response({
                'message': f'File "{filename}" uploaded and processed successfully!',
                'dataset': serializer.data
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response(
                {'error': f'Failed to process Excel file: {str(e)}'},
                status=status.HTTP_422_UNPROCESSABLE_ENTITY
            )


class LatestDatasetView(APIView):
    """Fetches the newest uploaded dataset. Supports ?sheet=Name query param."""
    def get(self, request, *args, **kwargs):
        latest = UploadedDataset.objects.order_by('-uploaded_at').first()
        if not latest:
            return Response({
                'has_data': False,
                'message': 'No dataset has been uploaded yet.'
            }, status=status.HTTP_200_OK)

        target_sheet = request.query_params.get('sheet')
        serializer = UploadedDatasetDetailSerializer(latest)
        data = serializer.data

        # If a specific sheet was requested and exists in all_sheets_data
        if target_sheet and target_sheet in latest.all_sheets_data:
            sheet_info = latest.all_sheets_data[target_sheet]
            data['active_sheet'] = target_sheet
            data['headers'] = sheet_info.get('headers', [])
            data['rows_data'] = sheet_info.get('rows', [])
            data['total_rows'] = sheet_info.get('total_rows', len(sheet_info.get('rows', [])))
            data['summary_stats'] = sheet_info.get('summary_stats', {})

        return Response({
            'has_data': True,
            'dataset': data
        }, status=status.HTTP_200_OK)


class DatasetStatusView(APIView):
    """Ultra lightweight endpoint polled by the render page to check for new updates."""
    def get(self, request, *args, **kwargs):
        latest = UploadedDataset.objects.order_by('-uploaded_at').first()
        if not latest:
            return Response({
                'has_data': False,
                'version': 0,
                'latest_id': None,
                'last_updated': None
            })
            
        return Response({
            'has_data': True,
            'latest_id': latest.id,
            'version': latest.version,
            'file_name': latest.file_name,
            'uploader_name': latest.uploader_name,
            'uploaded_at': latest.uploaded_at.isoformat(),
            'total_rows': latest.total_rows,
            'total_columns': latest.total_columns,
            'active_sheet': latest.active_sheet,
            'sheet_names': latest.sheet_names
        })


class DatasetHistoryView(APIView):
    """Returns list of all uploaded datasets for version history."""
    def get(self, request, *args, **kwargs):
        datasets = UploadedDataset.objects.all()[:30]
        serializer = UploadedDatasetSummarySerializer(datasets, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class DatasetDetailView(APIView):
    """Retrieve a specific dataset by ID."""
    def get(self, request, pk, *args, **kwargs):
        try:
            dataset = UploadedDataset.objects.get(pk=pk)
        except UploadedDataset.DoesNotExist:
            return Response({'error': 'Dataset not found.'}, status=status.HTTP_404_NOT_FOUND)

        target_sheet = request.query_params.get('sheet')
        serializer = UploadedDatasetDetailSerializer(dataset)
        data = serializer.data

        if target_sheet and target_sheet in dataset.all_sheets_data:
            sheet_info = dataset.all_sheets_data[target_sheet]
            data['active_sheet'] = target_sheet
            data['headers'] = sheet_info.get('headers', [])
            data['rows_data'] = sheet_info.get('rows', [])
            data['total_rows'] = sheet_info.get('total_rows', len(sheet_info.get('rows', [])))
            data['summary_stats'] = sheet_info.get('summary_stats', {})

        return Response(data, status=status.HTTP_200_OK)

    def delete(self, request, pk, *args, **kwargs):
        try:
            dataset = UploadedDataset.objects.get(pk=pk)
        except UploadedDataset.DoesNotExist:
            return Response({'error': 'Dataset not found.'}, status=status.HTTP_404_NOT_FOUND)

        dataset_file = dataset.file
        dataset.delete()
        if dataset_file:
            dataset_file.delete(save=False)

        return Response(status=status.HTTP_204_NO_CONTENT)


class DownloadSampleView(APIView):
    """Generates a styled sales monitoring sample Excel file for testing."""
    def get(self, request, *args, **kwargs):
        wb = openpyxl.Workbook()
        
        # Setup Sheet 1: Sales Q4
        ws1 = wb.active
        ws1.title = "Sales_Q4_Report"
        
        headers = [
            "Order ID", "Date", "Region", "Sales Representative", 
            "Product Category", "Product Name", "Units Sold", 
            "Unit Price ($)", "Total Revenue ($)", "Payment Status"
        ]
        
        sample_rows = [
            ["ORD-7001", "2026-10-01", "North America", "Alex Morgan", "Electronics", "Wireless Noise-Canceling Headphones", 45, 199.99, 8999.55, "Paid"],
            ["ORD-7002", "2026-10-02", "Europe", "Sophia Laurent", "Laptops & PCs", "Pro Laptop 16-inch 32GB", 18, 1850.00, 33300.00, "Paid"],
            ["ORD-7003", "2026-10-03", "Asia Pacific", "Kenji Sato", "Accessories", "Ergonomic Mechanical Keyboard", 80, 129.50, 10360.00, "Pending"],
            ["ORD-7004", "2026-10-04", "North America", "Marcus Vance", "Smart Home", "4K Ultra Security Camera Set", 25, 349.00, 8725.00, "Paid"],
            ["ORD-7005", "2026-10-05", "Latin America", "Elena Gomez", "Electronics", "Smart OLED Fitness Watch", 60, 220.00, 13200.00, "Paid"],
            ["ORD-7006", "2026-10-06", "Europe", "Oliver Schmidt", "Laptops & PCs", "Ultra-Slim Ultrabook 14", 22, 1420.00, 31240.00, "Paid"],
            ["ORD-7007", "2026-10-07", "Asia Pacific", "Kenji Sato", "Monitors", "34-inch Curved UltraWide Monitor", 30, 680.00, 20400.00, "Refunded"],
            ["ORD-7008", "2026-10-08", "North America", "Alex Morgan", "Accessories", "Precision Wireless Laser Mouse", 110, 79.99, 8798.90, "Paid"],
            ["ORD-7009", "2026-10-09", "Europe", "Sophia Laurent", "Smart Home", "Smart Voice Assistant Hub Pro", 55, 149.00, 8195.00, "Pending"],
            ["ORD-7010", "2026-10-10", "North America", "Marcus Vance", "Electronics", "True Wireless Earbuds v5", 95, 89.00, 8455.00, "Paid"],
            ["ORD-7011", "2026-10-11", "Latin America", "Elena Gomez", "Monitors", "27-inch 4K Studio Display", 15, 750.00, 11250.00, "Paid"],
            ["ORD-7012", "2026-10-12", "Asia Pacific", "Mei-Ling Chen", "Laptops & PCs", "Workstation Tower i9 64GB", 10, 2900.00, 29000.00, "Paid"],
            ["ORD-7013", "2026-10-13", "North America", "Alex Morgan", "Accessories", "Thunderbolt 4 Docking Station", 40, 249.99, 9999.60, "Paid"],
            ["ORD-7014", "2026-10-14", "Europe", "Oliver Schmidt", "Electronics", "Noise-Isolating Gaming Headset", 65, 119.00, 7735.00, "Paid"],
            ["ORD-7015", "2026-10-15", "Latin America", "Elena Gomez", "Smart Home", "Smart Ambient LED Lighting Kit", 70, 65.00, 4550.00, "Paid"]
        ]

        # Style header row
        ws1.append(headers)
        header_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
        header_fill = PatternFill(start_color="3B82F6", end_color="3B82F6", fill_type="solid")
        thin_border = Border(
            left=Side(style='thin', color='E2E8F0'),
            right=Side(style='thin', color='E2E8F0'),
            top=Side(style='thin', color='E2E8F0'),
            bottom=Side(style='thin', color='E2E8F0')
        )

        for col_num, _ in enumerate(headers, 1):
            cell = ws1.cell(row=1, column=col_num)
            cell.font = header_font
            cell.fill = header_fill
            cell.alignment = Alignment(horizontal="center", vertical="center")
            cell.border = thin_border
            ws1.row_dimensions[1].height = 28

        for row_idx, row in enumerate(sample_rows, 2):
            ws1.append(row)
            fill_color = "F8FAFC" if row_idx % 2 == 0 else "FFFFFF"
            row_fill = PatternFill(start_color=fill_color, end_color=fill_color, fill_type="solid")
            for col_idx in range(1, len(row) + 1):
                cell = ws1.cell(row=row_idx, column=col_idx)
                cell.border = thin_border
                cell.fill = row_fill
                if col_idx in (7, 8, 9):
                    cell.alignment = Alignment(horizontal="right")
                else:
                    cell.alignment = Alignment(horizontal="left")

        # Auto-fit column widths
        for col in ws1.columns:
            max_len = max(len(str(cell.value or '')) for cell in col)
            col_letter = openpyxl.utils.get_column_letter(col[0].column)
            ws1.column_dimensions[col_letter].width = max(max_len + 4, 14)

        output = io.BytesIO()
        wb.save(output)
        output.seek(0)

        response = HttpResponse(
            output.getvalue(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = 'attachment; filename="sales_monitoring_sample.xlsx"'
        return response
