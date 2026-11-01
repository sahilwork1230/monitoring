# Deploying on PythonAnywhere

The React build is served by Django, while PythonAnywhere serves collected static files directly. The production Vite build uses `/static/` for its JavaScript, CSS, and image URLs.

## Build and collect static files

From the project directory (the directory containing `manage.py`):

```bash
python -m pip install -r requirements.txt
cd frontend
npm ci
npm run build
cd ..
python manage.py collectstatic --noinput
python manage.py migrate
```

Build the frontend again and rerun `collectstatic` after frontend changes.

## Configure the web app

Create a manual-config web app using Python 3.10 or newer, set its virtualenv, and point its source/working directory at the project directory. In the WSGI file linked from the PythonAnywhere Web tab, set the project path and production settings before loading Django:

```python
import os
import sys

project_home = "/home/<username>/salesMonitoring"
if project_home not in sys.path:
    sys.path.insert(0, project_home)

os.environ["DJANGO_SETTINGS_MODULE"] = "backend.settings"
os.environ["DJANGO_DEBUG"] = "False"
os.environ["DJANGO_SECRET_KEY"] = "<a-long-random-secret>"
os.environ["DJANGO_ALLOWED_HOSTS"] = "<username>.pythonanywhere.com"

from django.core.wsgi import get_wsgi_application

application = get_wsgi_application()
```

Replace the example username, project path, hostname, and secret with your deployment values. Keep the production secret out of source control.

In the Web tab's **Static files** section, add this mapping and reload the web app:

| URL | Directory |
|---|---|
| `/static/` | `/home/<username>/salesMonitoring/staticfiles` |

`STATICFILES_DIRS` collects the generated `frontend/dist` assets into `STATIC_ROOT` (`staticfiles`). The served URL and Vite's production asset prefix must both remain `/static/`.

The frontend build output is git-ignored, so run `npm ci` and `npm run build` on PythonAnywhere after deploying the source, or upload the generated `frontend/dist` directory before running `collectstatic`.
