"""Verifica que la entrega descargable conserve estilos, recursos e interacciones."""
from pathlib import Path
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import subprocess
import sys
import tempfile
from threading import Thread
import unittest
import zipfile

from playwright.sync_api import sync_playwright, expect


ROOT = Path(__file__).resolve().parents[1]


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass


class DownloadTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.directory = tempfile.TemporaryDirectory(prefix='rumbo-download-')
        cls.output = Path(cls.directory.name)
        cls.html = cls.output / 'solo-este-archivo' / 'Rumbo-Vivo.html'
        cls.archive = cls.output / 'Rumbo-Vivo.zip'
        subprocess.run([
            sys.executable, str(ROOT / 'scripts/package_site.py'),
            '--html', str(cls.html), '--zip', str(cls.archive),
        ], check=True, capture_output=True, text=True)
        # El Chromium administrado bloquea file://. Servimos los archivos extraídos
        # desde su carpeta aislada, sin usar recursos del checkout original.
        cls.server = ThreadingHTTPServer(('127.0.0.1', 0), partial(QuietHandler, directory=str(cls.output)))
        cls.server_thread = Thread(target=cls.server.serve_forever, daemon=True)
        cls.server_thread.start()
        cls.base_url = f'http://127.0.0.1:{cls.server.server_port}'
        cls.playwright = sync_playwright().start()
        options = {'headless': True}
        if Path('/usr/bin/chromium').is_file():
            options['executable_path'] = '/usr/bin/chromium'
        cls.browser = cls.playwright.chromium.launch(**options)

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.playwright.stop()
        cls.server.shutdown()
        cls.server.server_close()
        cls.server_thread.join()
        cls.directory.cleanup()

    def test_single_file_opens_with_styles_images_and_functions(self):
        with self.browser.new_context(locale='es-AR', reduced_motion='reduce') as context:
            page = context.new_page()
            errors, requests = [], []
            page.on('pageerror', lambda error: errors.append(str(error)))
            page.on('request', lambda request: requests.append(request.url))
            url = self.base_url + '/solo-este-archivo/Rumbo-Vivo.html'
            page.goto(url, wait_until='networkidle')
            self.assertEqual(list(self.html.parent.iterdir()), [self.html])
            self.assertEqual(page.evaluate('document.styleSheets.length'), 1)
            self.assertEqual(page.locator('body').evaluate('(e) => getComputedStyle(e).backgroundColor'), 'rgb(250, 250, 245)')
            expect(page.locator('.stay-card')).to_have_count(6)
            expect(page.locator('.team-name')).to_have_count(7)
            expect(page.locator('.team-section input')).to_have_count(0)
            expect(page.locator('.brand-mark img')).to_have_count(2)
            page.locator('#load-more').click()
            expect(page.locator('.stay-card')).to_have_count(12)
            for image in page.locator('img').all():
                image.scroll_into_view_if_needed()
                image.evaluate('(image) => image.decode()')
                self.assertTrue(image.get_attribute('src').startswith('data:image/'))
                self.assertGreater(image.evaluate('(image) => image.naturalWidth'), 0)
            page.locator('#filter-destination').select_option('mendoza')
            expect(page.locator('.stay-card')).to_have_count(2)
            page.locator('[data-favorite="finca-raiz"]').click()
            expect(page.locator('#favorite-count')).to_have_text('1')
            page.locator('[data-detail="finca-raiz"]').click()
            expect(page.locator('#detail-title')).to_have_text('Finca Raíz')
            page.locator('#demo-plan').click()
            expect(page.locator('#plan-result')).to_contain_text('Esto no es una reserva')
            page.keyboard.press('Escape')
            page.reload(wait_until='networkidle')
            expect(page.locator('#favorite-count')).to_have_text('1')
            self.assertEqual(errors, [])
            local_requests = [url for url in requests if not url.startswith('data:')]
            self.assertTrue(all(request_url == url for request_url in local_requests), local_requests)

    def test_zip_contains_the_sources_and_opens_after_extraction(self):
        extracted = self.output / 'extraido'
        with zipfile.ZipFile(self.archive) as archive:
            self.assertIsNone(archive.testzip())
            names = archive.namelist()
            for filename in ['index.html', 'css/styles.css', 'js/app.js', 'js/data.js', 'Rumbo-Vivo.html', 'assets/fonts/dm-sans.ttf', 'assets/images/hero.png']:
                self.assertIn('Rumbo-Vivo/' + filename, names)
            self.assertFalse(any('/.git/' in name or '__pycache__' in name for name in names))
            archive.extractall(extracted)
        with self.browser.new_context(locale='es-AR', reduced_motion='reduce') as context:
            page = context.new_page()
            errors = []
            page.on('pageerror', lambda error: errors.append(str(error)))
            page.goto(self.base_url + '/extraido/Rumbo-Vivo/index.html', wait_until='networkidle')
            self.assertEqual(page.locator('body').evaluate('(e) => getComputedStyle(e).backgroundColor'), 'rgb(250, 250, 245)')
            for image in page.locator('.brand-mark img, .andi-portrait img').all():
                image.scroll_into_view_if_needed()
                expect(image).to_have_js_property('complete', True)
                self.assertIsNone(image.get_attribute('data-fallback'))
                self.assertGreater(image.evaluate('(image) => image.naturalWidth'), 0)
            expect(page.locator('.team-name')).to_have_count(7)
            expect(page.locator('.destination-card')).to_have_count(6)
            expect(page.locator('.stay-card')).to_have_count(6)
            self.assertEqual(errors, [])


if __name__ == '__main__':
    unittest.main(verbosity=2)
