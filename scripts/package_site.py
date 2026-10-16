"""Genera una web autocontenida y, opcionalmente, un ZIP del proyecto.

No instala dependencias ni modifica los archivos fuente.
"""
import argparse
import base64
import json
import mimetypes
from pathlib import Path
import re
import zipfile
from urllib.parse import urldefrag


ROOT = Path(__file__).resolve().parents[1]


def data_uri(path):
    mime = mimetypes.guess_type(path.name)[0] or 'application/octet-stream'
    return f'data:{mime};base64,{base64.b64encode(path.read_bytes()).decode("ascii")}'


def build_html():
    html = (ROOT / 'index.html').read_text(encoding='utf-8')
    css_path = ROOT / 'css/styles.css'
    css = css_path.read_text(encoding='utf-8')

    def embed_css_resource(match):
        resource = (css_path.parent / match.group(2)).resolve()
        resource.relative_to(ROOT)
        return f'url("{data_uri(resource)}")'

    css = re.sub(r'url\(([\'"]?)([^)\'"]+)\1\)', embed_css_resource, css)
    html = re.sub(r'<link\b[^>]*\brel="preload"[^>]*>', '', html, flags=re.I)
    html, count = re.subn(
        r'<link\b[^>]*\brel="stylesheet"[^>]*>',
        lambda _: '<style>\n' + css + '\n</style>', html, flags=re.I,
    )
    if count != 1:
        raise ValueError('Se esperaba una hoja de estilos en index.html')

    def embed_html_resource(match):
        attribute, filename = match.groups()
        filename, fragment = urldefrag(filename)
        source = data_uri(ROOT / filename)
        if fragment:
            source += '#' + fragment
        return f'{attribute}="{source}"'

    html = re.sub(r'(src|href)="(assets/[^\"]+)"', embed_html_resource, html)
    scripts = []
    images = {
        path.name: data_uri(path)
        for path in sorted((ROOT / 'assets/images').iterdir())
        if path.is_file()
    }
    scripts.append('window.RUMBO_IMAGE_SOURCES = ' + json.dumps(images) + ';')
    for filename in ['js/data.js', 'js/app.js']:
        pattern = r'<script\b[^>]*src="' + re.escape(filename) + r'"[^>]*>\s*</script>'
        html, count = re.subn(pattern, '', html)
        if count != 1:
            raise ValueError(f'No se encontró exactamente una referencia a {filename}')
        scripts.append((ROOT / filename).read_text(encoding='utf-8'))
    code = '\n'.join(scripts).replace('</script', '<\\/script')
    html = html.replace('</body>', '<script>\n' + code + '\n</script>\n</body>')
    html = html.replace('<html lang="es-AR">', '<!-- Generado con scripts/package_site.py. Editar los archivos fuente. -->\n<html lang="es-AR">')
    return '\n'.join(line.rstrip() for line in html.splitlines()) + '\n'


def build_zip(path, html_path):
    path.parent.mkdir(parents=True, exist_ok=True)
    roots = ['index.html', '.gitignore', 'README.md', 'CREDITS.md', 'css', 'js', 'assets', 'tests', 'scripts']
    with zipfile.ZipFile(path, 'w', compression=zipfile.ZIP_DEFLATED) as archive:
        for name in roots:
            root = ROOT / name
            files = sorted(root.rglob('*')) if root.is_dir() else [root]
            for file in files:
                if not file.is_file() or '__pycache__' in file.parts or file.suffix == '.pyc':
                    continue
                archive.write(file, 'Rumbo-Vivo/' + file.relative_to(ROOT).as_posix())
        archive.write(html_path, 'Rumbo-Vivo/Rumbo-Vivo.html')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--html', type=Path, default=ROOT / 'Rumbo-Vivo.html')
    parser.add_argument('--zip', type=Path, dest='zip_path')
    args = parser.parse_args()
    args.html.parent.mkdir(parents=True, exist_ok=True)
    args.html.write_text(build_html(), encoding='utf-8')
    print(f'HTML listo: {args.html} ({args.html.stat().st_size:,} bytes)')
    if args.zip_path:
        build_zip(args.zip_path, args.html)
        print(f'ZIP listo: {args.zip_path} ({args.zip_path.stat().st_size:,} bytes)')


if __name__ == '__main__':
    main()
