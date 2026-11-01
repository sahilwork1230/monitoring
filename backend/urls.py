from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

from backend.frontend_views import frontend_app

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("data_monitor.urls")),

    # React frontend routes
    path("upload/", frontend_app, name="frontend-upload"),
    path("monitor/", frontend_app, name="frontend-monitor"),
    path("", frontend_app, name="frontend-home"),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)