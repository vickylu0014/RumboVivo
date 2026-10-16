"""Pruebas funcionales contra un servidor estático ya iniciado.

Ejecutar: python3 -m unittest discover -s tests -v
Requiere Playwright y Chromium; no son dependencias de la aplicación.
"""
import os
import re
import unittest
from datetime import date, timedelta
from playwright.sync_api import sync_playwright, expect


TEAM_NAMES = ['Sofia Carolina Becerra', 'Julieta Belén Combes', 'Benjamin Genco', 'Maria Victoria Lucero Herrera', 'Catalina Oyarzabal Bastanzo', 'Sol Magali Ruiz', 'Sol Agustina Veisaga Arce']

class RumboVivoBrowserTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.playwright = sync_playwright().start()
        executable = os.environ.get('CHROMIUM_PATH', '/usr/bin/chromium')
        options = {'headless': True}
        if os.path.isfile(executable):
            options['executable_path'] = executable
        cls.browser = cls.playwright.chromium.launch(**options)
        cls.base_url = os.environ.get('RUMBO_BASE_URL', 'http://127.0.0.1:4173')

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.playwright.stop()

    def setUp(self):
        self.context = self.browser.new_context(viewport={'width': 1440, 'height': 1000}, locale='es-AR', reduced_motion='reduce')
        self.page = self.context.new_page()
        self.errors = []
        self.page.on('pageerror', lambda error: self.errors.append(str(error)))
        self.page.goto(self.base_url, wait_until='networkidle')

    def tearDown(self):
        self.assertEqual(self.errors, [], 'Errores de JavaScript en el navegador')
        self.context.close()

    def search(self, destination='', travelers='2', arrival='', departure='', budget='150000'):
        self.page.locator('#search-destination').select_option(destination)
        self.page.locator('#travelers').select_option(travelers)
        self.page.locator('#check-in').fill(arrival)
        self.page.locator('#check-out').fill(departure)
        self.page.locator('#search-budget').select_option(budget)
        self.page.locator('#search-form button[type=submit]').click()

    def future(self, days):
        # Coincide con el calendario local del navegador, incluso cerca de medianoche.
        today = self.page.evaluate("new Date().toLocaleDateString('en-CA')")
        return (date.fromisoformat(today) + timedelta(days=days)).isoformat()

    def test_01_catalog_and_local_assets(self):
        expect(self.page.locator('.destination-card')).to_have_count(6)
        expect(self.page.locator('.stay-card')).to_have_count(6)
        self.page.locator('#load-more').click()
        expect(self.page.locator('.stay-card')).to_have_count(12)
        expect(self.page.locator('#load-more')).to_be_hidden()
        self.assertTrue(self.page.evaluate("document.fonts.check('16px \"DM Sans\"') && document.fonts.check('16px Fraunces')"))
        for image in self.page.locator('img').all():
            image.scroll_into_view_if_needed()
            expect(image).to_have_js_property('complete', True)
            self.assertGreater(image.evaluate('(image) => image.naturalWidth'), 0)
        self.assertEqual(self.page.locator('img[data-fallback]').count(), 0)

    def test_02_each_destination_filters_its_stays(self):
        for destination in ['mendoza', 'bariloche', 'buenos-aires', 'rio', 'roma', 'iguazu']:
            self.page.locator(f'[data-destination="{destination}"]').click()
            expect(self.page.locator('.stay-card')).to_have_count(2)
            expect(self.page.locator('#filter-destination')).to_have_value(destination)

    def test_03_combined_impact_budget_and_type_filters(self):
        self.page.locator('#filter-type').select_option('Cabaña')
        for selector in ['#filter-local', '#filter-accessible', '#filter-environmental']:
            self.page.locator(selector).check()
        self.page.locator('#filter-budget').fill('60000')
        expect(self.page.locator('.stay-card')).to_have_count(1)
        expect(self.page.locator('.stay-card h3')).to_have_text('Tierra Colorada')
        expect(self.page.locator('#search-budget')).to_have_value('60000')
        self.page.locator('#filter-budget').fill('20000')
        expect(self.page.locator('#empty-state')).to_be_visible()
        expect(self.page.locator('.stay-card')).to_have_count(0)
        self.page.locator('#empty-reset').click()
        expect(self.page.locator('#results-count')).to_contain_text('12')

    def test_04_price_sort_in_both_directions(self):
        self.page.locator('#sort').select_option('price-asc')
        expect(self.page.locator('.stay-card h3').first).to_have_text('Selva Adentro')
        self.page.locator('#load-more').click()
        expect(self.page.locator('.stay-card h3').last).to_have_text('Cortile Romano')
        self.page.locator('#sort').select_option('price-desc')
        expect(self.page.locator('.stay-card h3').first).to_have_text('Cortile Romano')

    def test_05_dates_reject_incomplete_reversed_and_past_ranges(self):
        self.search(arrival=self.future(3))
        expect(self.page.locator('#search-error')).to_contain_text('salida')
        self.search(arrival=self.future(3), departure=self.future(3))
        expect(self.page.locator('#search-error')).to_contain_text('posterior')
        self.search(arrival=self.future(5), departure=self.future(2))
        expect(self.page.locator('#search-error')).to_contain_text('posterior')
        self.search(arrival=self.future(-2), departure=self.future(2))
        expect(self.page.locator('#search-error')).to_contain_text('anterior a hoy')
        self.search(departure=self.future(4))
        expect(self.page.locator('#search-error')).to_contain_text('entrada')

    def test_06_dates_and_capacity_affect_results(self):
        self.search('mendoza', arrival=self.future(11), departure=self.future(13))
        expect(self.page.locator('.stay-card')).to_have_count(1)
        expect(self.page.locator('.stay-card h3')).to_have_text('Casa de la Acequia')
        self.search('mendoza', '4', self.future(1), self.future(3))
        expect(self.page.locator('.stay-card h3')).to_have_text('Finca Raíz')
        self.search('mendoza', '5', self.future(1), self.future(3))
        expect(self.page.locator('#empty-state')).to_be_visible()

    def test_07_favorites_persist_and_can_be_removed(self):
        favorite = self.page.locator('[data-favorite="finca-raiz"]')
        favorite.click()
        expect(self.page.locator('#favorite-count')).to_have_text('1')
        expect(favorite).to_have_attribute('aria-pressed', 'true')
        self.page.reload()
        expect(self.page.locator('#favorite-count')).to_have_text('1')
        self.page.locator('#open-favorites').click()
        expect(self.page.locator('.stay-card')).to_have_count(1)
        favorite.click()
        expect(self.page.locator('#favorite-count')).to_have_text('0')
        expect(self.page.locator('#empty-state')).to_be_visible()

    def test_08_details_plan_total_and_keyboard_close(self):
        self.search('mendoza', '2', self.future(1), self.future(3))
        self.page.locator('[data-detail="finca-raiz"]').click()
        expect(self.page.locator('#detail-dialog')).to_be_visible()
        expect(self.page.locator('#detail-title')).to_have_text('Finca Raíz')
        expect(self.page.locator('.detail-indicators li')).to_have_count(5)
        self.page.locator('#demo-plan').click()
        expect(self.page.locator('#plan-result')).to_contain_text('$ 136.000 ARS')
        expect(self.page.locator('#plan-result')).to_contain_text('Esto no es una reserva')
        self.page.keyboard.press('Escape')
        expect(self.page.locator('#detail-dialog')).not_to_be_visible()
        expect(self.page.locator('body')).not_to_have_class(re.compile(r'.*modal-open.*'))

    def test_09_compare_limits_table_and_detail_navigation(self):
        self.page.locator('[data-compare="finca-raiz"]').check()
        expect(self.page.locator('#open-compare')).to_be_disabled()
        for stay in ['casa-acequia', 'refugio-arrayan']:
            self.page.locator(f'[data-compare="{stay}"]').check()
        self.page.locator('[data-compare="orilla-sur"]').click()
        expect(self.page.locator('[data-compare="orilla-sur"]')).not_to_be_checked()
        expect(self.page.locator('#compare-count')).to_have_text('3')
        self.page.locator('#open-compare').click()
        expect(self.page.locator('#compare-dialog')).to_be_visible()
        expect(self.page.locator('.comparison-table thead th')).to_have_count(4)
        expect(self.page.locator('.comparison-table')).to_contain_text('Sin verificación')
        self.page.locator('[data-compare-detail="casa-acequia"]').click()
        expect(self.page.locator('#compare-dialog')).not_to_be_visible()
        expect(self.page.locator('#detail-title')).to_have_text('Casa de la Acequia')
        self.page.locator('[data-close="detail-dialog"]').click()
        self.page.locator('#clear-compare').click()
        expect(self.page.locator('#compare-bar')).to_be_hidden()

    def test_10_contact_validates_without_sending(self):
        requests = []
        self.page.on('request', lambda request: requests.append(request.method))
        self.page.locator('#contact-form button[type=submit]').click()
        expect(self.page.locator('#contact-name')).to_be_focused()
        expect(self.page.locator('#name-error')).not_to_be_empty()
        expect(self.page.locator('#email-error')).not_to_be_empty()
        expect(self.page.locator('#reason-error')).not_to_be_empty()
        expect(self.page.locator('#message-error')).not_to_be_empty()
        self.page.locator('#contact-name').fill('Lucía Pérez')
        self.page.locator('#contact-email').fill('correo-invalido')
        self.page.locator('#contact-reason').select_option(label='Triple impacto')
        self.page.locator('#contact-message').fill('Me interesa conocer las iniciativas locales del proyecto.')
        self.page.locator('#contact-form button[type=submit]').click()
        expect(self.page.locator('#email-error')).not_to_be_empty()
        self.page.locator('#contact-email').fill('lucia@example.com')
        self.page.locator('#contact-form button[type=submit]').click()
        expect(self.page.locator('#contact-result')).to_contain_text('no se envió ni se guardó')
        self.assertNotIn('POST', requests)
        self.assertFalse(self.page.evaluate("Object.keys(localStorage).some(key => /contact|email|message/.test(key))"))

    def test_11_fixed_team_and_preferences_persist(self):
        expect(self.page.locator('.team-name')).to_have_text(TEAM_NAMES)
        expect(self.page.locator('.team-section input, .team-section select, .team-section button')).to_have_count(0)
        self.page.evaluate("localStorage.setItem('rumbo-vivo:team', '[\"Nombre anterior\"]')")
        self.page.locator('#filter-destination').select_option('roma')
        self.page.locator('#filter-environmental').check()
        self.page.reload()
        expect(self.page.locator('.team-name')).to_have_text(TEAM_NAMES)
        expect(self.page.locator('#filter-destination')).to_have_value('roma')
        expect(self.page.locator('#filter-environmental')).to_be_checked()
        expect(self.page.locator('.stay-card h3')).to_have_text('Via Verde')

    def test_12_mobile_menu_and_internal_navigation(self):
        self.page.set_viewport_size({'width': 360, 'height': 800})
        self.page.locator('#menu-toggle').click()
        expect(self.page.locator('#menu-toggle')).to_have_attribute('aria-expanded', 'true')
        for name in ['Inicio', 'Destinos', 'Alojamientos', 'Triple impacto', 'Cómo funciona', 'Nosotros', 'Contacto']:
            expect(self.page.locator('#main-nav').get_by_role('link', name=name, exact=False)).to_be_visible()
        self.page.keyboard.press('Escape')
        expect(self.page.locator('#menu-toggle')).to_have_attribute('aria-expanded', 'false')
        expect(self.page.locator('#menu-toggle')).to_be_focused()
        self.page.locator('#menu-toggle').click()
        self.page.locator('#main-nav a[href="#contacto"]').click()
        expect(self.page.locator('#menu-toggle')).to_have_attribute('aria-expanded', 'false')
        self.assertEqual(self.page.evaluate('location.hash'), '#contacto')
        expect(self.page.locator('#back-top')).to_be_visible()
        self.page.locator('#back-top').click()
        self.page.wait_for_function('scrollY < 20')

    def test_13_responsive_widths_and_valid_links(self):
        for width in [360, 390, 768, 1024, 1440, 1920]:
            self.page.set_viewport_size({'width': width, 'height': 900})
            self.assertFalse(self.page.evaluate('document.documentElement.scrollWidth > innerWidth'), f'Desborde a {width}px')
        invalid = self.page.locator('a').evaluate_all("(links) => links.filter(a => !a.hash || !document.getElementById(a.hash.slice(1))).map(a => a.outerHTML)")
        self.assertEqual(invalid, [])
        ids = self.page.locator('[id]').evaluate_all('(elements) => elements.map(e => e.id)')
        self.assertEqual(len(ids), len(set(ids)))

    def test_14_corrupt_and_unavailable_storage(self):
        self.page.evaluate("localStorage.setItem('rumbo-vivo:favorites', '{broken'); localStorage.setItem('rumbo-vivo:preferences', 'null'); localStorage.setItem('rumbo-vivo:team', '42')")
        self.page.reload()
        expect(self.page.locator('.stay-card')).to_have_count(6)
        expect(self.page.locator('#favorite-count')).to_have_text('0')
        self.page.evaluate("Object.defineProperty(window, 'localStorage', {get() {throw new DOMException('Storage blocked', 'SecurityError')}})")
        self.page.locator('[data-favorite="finca-raiz"]').click()
        expect(self.page.locator('#favorite-count')).to_have_text('1')
        expect(self.page.locator('#toast')).to_contain_text('no permite guardar datos')

    def test_15_missing_image_has_a_local_fallback(self):
        self.page.route('**/assets/images/stay-1.jpg', lambda route: route.abort())
        self.page.reload()
        image = self.page.locator('[data-stay="finca-raiz"] .stay-photo > img')
        image.scroll_into_view_if_needed()
        expect(image).to_have_attribute('src', 'assets/images/fallback.svg')
        expect(image).to_have_attribute('alt', 'Ilustración de un paisaje; fotografía no disponible')
        expect(image).to_have_js_property('complete', True)
        self.assertGreater(image.evaluate('(image) => image.naturalWidth'), 0)

    def test_16_impact_actions_apply_the_corresponding_filter(self):
        for name in ['accessible', 'local', 'environmental']:
            self.page.locator(f'[data-impact-filter="{name}"]').click()
            expect(self.page.locator(f'#filter-{name}')).to_be_checked()
            self.assertGreater(self.page.locator('.stay-card').count(), 0)


    def test_17_andi_in_brand_about_and_motion_preferences(self):
        expect(self.page.locator('.brand-mark img')).to_have_count(2)
        for image in self.page.locator('.brand-mark img, .andi-portrait img').all():
            expect(image).to_have_attribute('src', re.compile(r'assets/images/andi\.svg(?:#retrato)?$'))
            expect(image).to_have_attribute('alt', re.compile('Andi'))
            image.scroll_into_view_if_needed()
            expect(image).to_have_js_property('complete', True)
            self.assertIsNone(image.get_attribute('data-fallback'))
            self.assertGreater(image.evaluate('(image) => image.naturalWidth'), 0)
        expect(self.page.locator('#nosotros .andi-intro')).to_contain_text('biodiversidad')
        expect(self.page.locator('#nosotros .andi-intro')).to_contain_text('turismo responsable')
        self.page.goto(self.base_url + '/assets/images/andi.svg')
        for selector in ['.andi-flight', '.andi-wing-left', '.andi-wing-right']:
            self.assertEqual(self.page.locator(selector).evaluate('(element) => getComputedStyle(element).animationName'), 'none')
        self.page.emulate_media(reduced_motion='no-preference')
        self.page.wait_for_function("getComputedStyle(document.querySelector('.andi-wing-left')).animationName !== 'none'")
        for selector in ['.andi-flight', '.andi-wing-left', '.andi-wing-right']:
            self.assertGreater(self.page.locator(selector).evaluate('(element) => element.getAnimations().length'), 0)

    def test_18_team_is_readable_without_javascript(self):
        with self.browser.new_context(java_script_enabled=False) as context:
            page = context.new_page()
            page.goto(self.base_url, wait_until='networkidle')
            expect(page.locator('.team-name')).to_have_text(TEAM_NAMES)
            expect(page.locator('.team-section input, .team-section button')).to_have_count(0)


if __name__ == '__main__':
    unittest.main(verbosity=2)
