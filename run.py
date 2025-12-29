from flask import Flask, send_from_directory, request, redirect
import os
import requests

BASE_DIR = os.path.abspath(os.path.dirname(__file__))

PAGES_DIR = os.path.join(BASE_DIR, "pages")
IMG_DIR = os.path.join(BASE_DIR, "static/img")

app = Flask(__name__, static_folder=None)

# ================================
# Fungsi bantu cek session admin
# ================================
def is_admin_logged_in(req_cookies):
    try:
        res = requests.get(
            "http://127.0.0.1:5000/api/admin/profile",
            cookies=req_cookies,
            timeout=2
        )
        return res.status_code == 200
    except:
        return False

# ================================
# Route untuk semua halaman HTML
# ================================
@app.route("/", defaults={"page": "index"})
@app.route("/<path:page>")
def html_pages(page):
    if "." not in page:
        page = page + ".html"

    # Halaman admin yang butuh login
    admin_pages = ["dashboard.html", "kelola.html", "profile.html"]

    if page in admin_pages:
        if not is_admin_logged_in(request.cookies):
            return redirect("/login")

    return send_from_directory(PAGES_DIR, page)

# ================================
# CSS
# ================================
@app.route("/css/<path:filename>")
def serve_css(filename):
    return send_from_directory(os.path.join(PAGES_DIR, "css"), filename)

# ================================
# JS
# ================================
@app.route("/js/<path:filename>")
def serve_js(filename):
    return send_from_directory(os.path.join(PAGES_DIR, "js"), filename)

# ================================
# Gambar (static)
# ================================
@app.route("/img/<path:filename>")
def serve_img(filename):
    return send_from_directory(IMG_DIR, filename)

# ================================
# Jalankan server FE
# ================================
if __name__ == "__main__":
    print("-" * 50)
    print(" 🛠️ SERVER FRONT-END (FE) SIAP")
    print(" 🌐 Frontend Aktif di: http://127.0.0.1:3002")
    print("-" * 50)
    app.run(debug=True, port=3002)
