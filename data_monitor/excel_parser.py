import openpyxl
import pandas as pd
import datetime
import math
import os

def clean_value(val):
    """Normalize cell values for clean JSON output."""
    if val is None:
        return ""
    if isinstance(val, (int, float)):
        if math.isnan(val) or math.isinf(val):
            return ""
        # If float is an exact integer, format as int for cleaner display
        if isinstance(val, float) and val.is_integer():
            return int(val)
        return round(val, 4)
    if isinstance(val, (datetime.datetime, datetime.date, pd.Timestamp)):
        return val.strftime('%Y-%m-%d %H:%M:%S' if isinstance(val, (datetime.datetime, pd.Timestamp)) and (val.hour or val.minute or val.second) else '%Y-%m-%d')
    return str(val).strip()

def compute_column_stats(headers, rows):
    """Compute summary statistics for numeric and categorical columns."""
    stats = {
        'numeric_columns': {},
        'categorical_columns': {},
        'total_rows': len(rows),
        'total_columns': len(headers)
    }
    
    for h in headers:
        values = [r.get(h) for r in rows if r.get(h) not in (None, "", "None", "NaN")]
        numeric_vals = []
        for v in values:
            if isinstance(v, (int, float)):
                numeric_vals.append(float(v))
            elif isinstance(v, str):
                try:
                    # check if clean string can be numeric (e.g. "$1,200" or "450")
                    clean_str = v.replace('$', '').replace(',', '').strip()
                    numeric_vals.append(float(clean_str))
                except ValueError:
                    pass
        
        # If >= 60% of non-empty values are numeric, treat as numeric column
        if len(values) > 0 and (len(numeric_vals) / len(values)) >= 0.6:
            col_sum = sum(numeric_vals)
            col_avg = col_sum / len(numeric_vals) if numeric_vals else 0
            stats['numeric_columns'][h] = {
                'count': len(numeric_vals),
                'sum': round(col_sum, 2),
                'avg': round(col_avg, 2),
                'min': round(min(numeric_vals), 2) if numeric_vals else 0,
                'max': round(max(numeric_vals), 2) if numeric_vals else 0
            }
        else:
            unique_vals = set(str(v) for v in values)
            stats['categorical_columns'][h] = {
                'count': len(values),
                'unique_count': len(unique_vals)
            }
            
    return stats

def parse_uploaded_file(file_obj, filename):
    """
    Parses an uploaded Excel or CSV file.
    Returns:
        sheet_names: list of sheets
        active_sheet: name of primary sheet
        headers: headers for active sheet
        rows_data: list of dict rows for active sheet
        all_sheets_data: dict of all sheets with headers, rows, stats
        summary_stats: summary metrics
    """
    ext = os.path.splitext(filename)[1].lower()
    
    all_sheets_data = {}
    sheet_names = []
    
    if ext == '.csv':
        try:
            df = pd.read_csv(file_obj, encoding='utf-8')
        except UnicodeDecodeError:
            file_obj.seek(0)
            df = pd.read_csv(file_obj, encoding='latin1')
            
        sheet_name = 'Sheet1'
        sheet_names = [sheet_name]
        
        # Clean headers
        headers = [str(col).strip() if str(col).strip() else f"Column_{i+1}" for i, col in enumerate(df.columns)]
        df.columns = headers
        
        rows = []
        for _, row in df.iterrows():
            row_dict = {h: clean_value(row[h]) for h in headers}
            # Only include row if not completely blank
            if any(str(v) != "" for v in row_dict.values()):
                rows.append(row_dict)
                
        stats = compute_column_stats(headers, rows)
        all_sheets_data[sheet_name] = {
            'headers': headers,
            'rows': rows,
            'total_rows': len(rows),
            'summary_stats': stats
        }
        active_sheet = sheet_name
        
    elif ext in ('.xlsx', '.xlsm', '.xltx', '.xltm'):
        wb = openpyxl.load_workbook(file_obj, data_only=True)
        sheet_names = wb.sheetnames
        active_sheet = sheet_names[0] if sheet_names else 'Sheet1'
        
        for sname in sheet_names:
            ws = wb[sname]
            iter_rows = ws.iter_rows(values_only=True)
            
            # Find header row (first non-empty row)
            header_row = None
            for row in iter_rows:
                if any(cell is not None and str(cell).strip() != "" for cell in row):
                    header_row = row
                    break
                    
            if not header_row:
                all_sheets_data[sname] = {
                    'headers': [],
                    'rows': [],
                    'total_rows': 0,
                    'summary_stats': {}
                }
                continue
                
            # Process headers: deduplicate and fill empty names
            headers = []
            seen = {}
            for i, h in enumerate(header_row):
                name = str(h).strip() if h is not None and str(h).strip() else f"Col_{i+1}"
                if name in seen:
                    seen[name] += 1
                    name = f"{name}_{seen[name]}"
                else:
                    seen[name] = 1
                headers.append(name)
                
            rows = []
            for row in iter_rows:
                if row is None or not any(cell is not None and str(cell).strip() != "" for cell in row):
                    continue
                row_dict = {}
                for i, h in enumerate(headers):
                    val = row[i] if i < len(row) else None
                    row_dict[h] = clean_value(val)
                rows.append(row_dict)
                
            stats = compute_column_stats(headers, rows)
            all_sheets_data[sname] = {
                'headers': headers,
                'rows': rows,
                'total_rows': len(rows),
                'summary_stats': stats
            }
            
    elif ext == '.xls':
        # Excel 97-2003 format using pandas
        excel_file = pd.ExcelFile(file_obj)
        sheet_names = excel_file.sheet_names
        active_sheet = sheet_names[0] if sheet_names else 'Sheet1'
        
        for sname in sheet_names:
            df = excel_file.parse(sname)
            headers = [str(col).strip() if str(col).strip() else f"Column_{i+1}" for i, col in enumerate(df.columns)]
            df.columns = headers
            rows = []
            for _, row in df.iterrows():
                row_dict = {h: clean_value(row[h]) for h in headers}
                if any(str(v) != "" for v in row_dict.values()):
                    rows.append(row_dict)
            stats = compute_column_stats(headers, rows)
            all_sheets_data[sname] = {
                'headers': headers,
                'rows': rows,
                'total_rows': len(rows),
                'summary_stats': stats
            }
    else:
        raise ValueError(f"Unsupported file format: {ext}. Please upload .xlsx, .xls, or .csv files.")
        
    primary_data = all_sheets_data.get(active_sheet, {'headers': [], 'rows': [], 'summary_stats': {}})
    
    return {
        'sheet_names': sheet_names,
        'active_sheet': active_sheet,
        'headers': primary_data.get('headers', []),
        'rows_data': primary_data.get('rows', []),
        'all_sheets_data': all_sheets_data,
        'total_rows': len(primary_data.get('rows', [])),
        'total_columns': len(primary_data.get('headers', [])),
        'summary_stats': primary_data.get('summary_stats', {})
    }
