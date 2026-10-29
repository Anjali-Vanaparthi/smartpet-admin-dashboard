#!/usr/bin/env python3
"""Bundle the modular source into one self-contained HTML file.

    python3 build.py            ->  dist/db-admin.html

CSS files in css/ and JS files in js/ are concatenated in filename order
(the numeric prefix is the load order), then injected into index.template.html.
"""
import base64, glob, os

root = os.path.dirname(os.path.abspath(__file__))
read = lambda p: open(p, encoding="utf-8").read()

def bundle(folder, ext):
    files = sorted(glob.glob(os.path.join(root, folder, "*." + ext)))
    return "\n\n".join(read(f).rstrip() for f in files)

html = read(os.path.join(root, "index.template.html"))
html = html.replace("/*@css*/", bundle("css", "css")).replace("/*@js*/", bundle("js", "js"))

# images in img/ are embedded as data URIs so the output stays a single file: /*@img:login-dog.jpg*/
for f in glob.glob(os.path.join(root, "img", "*")):
    mime = "image/png" if f.endswith(".png") else "image/jpeg"
    uri = f"data:{mime};base64," + base64.b64encode(open(f, "rb").read()).decode()
    html = html.replace(f"/*@img:{os.path.basename(f)}*/", uri)

out = os.path.join(root, "dist")
os.makedirs(out, exist_ok=True)
path = os.path.join(out, "db-admin.html")
open(path, "w", encoding="utf-8").write(html)
print(f"built {path} ({len(html):,} bytes)")
