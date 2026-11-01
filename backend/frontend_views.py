from pathlib import Path

from django.conf import settings
from django.http import Http404
from django.shortcuts import render


def frontend_app(request):
    index_file = Path(settings.BASE_DIR) / "frontend" / "dist" / "index.html"

    if not index_file.exists():
        raise Http404("Frontend build not found. Run npm run build.")

    return render(request, "index.html")