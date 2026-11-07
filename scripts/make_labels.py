#!/usr/bin/env python3
"""Render concept can wraps to public/labels/*.webp. Run from repo root: python3 scripts/make_labels.py

These are recreations for the pitch demo, not official Red Bull artwork. Swap in the
real flat wraps if they become available: same aspect ratio (1024:824), full UV wrap.
"""
import base64, io, re
from pathlib import Path
from PIL import Image
from playwright.sync_api import sync_playwright

W, H = 2048, 1648
logo = Path("public/images/redbulllogo.svg").read_text()
paths = re.findall(r'<path fill="[^"]+"(?: fill-rule="evenodd")? d="([^"]+)"(?: clip-rule="evenodd")?/>', logo)
assert len(paths) >= 9, f"logo structure changed: {len(paths)} paths"
WORD, SUN, GLOW, BULL_R_A, BULL_R, BULL_L = paths[:4], paths[4], paths[5], paths[6], paths[7], paths[8]
font = base64.b64encode(Path("public/fonts/Bull-Bold.woff2").read_bytes()).decode()

P = lambda ds, fill: "".join(f'<path fill="{fill}" fill-rule="evenodd" d="{d}"/>' for d in ds)
word = lambda fill: f'<svg viewBox="106 3 119 31" width="100%" style="display:block;overflow:visible">{P(WORD, fill)}</svg>'
bulls = f'<svg viewBox="0 0 100 36" width="100%" style="display:block">{P([SUN],"#FC0")}{P([GLOW],"#FC0")}{P([BULL_R_A,BULL_R,BULL_L],"#D2003C")}</svg>'
bull = lambda fill: f'<svg viewBox="0 0 48 36" width="100%" style="display:block;overflow:visible">{P([BULL_L],fill)}</svg>'


def classic(base, dark, tag, name, band=None, back=False):
    # Back panel mirrors the diagonal, so it meets the front panel at both seams instead of leaving a strip.
    diagonal = "polygon(0 0,100% 0,100% 74%,0 28%)" if back else "polygon(0 0,100% 0,100% 28%,0 74%)"
    return f'''<div class="p" style="background:{base}">
      <div style="position:absolute;inset:0;background:conic-gradient(from 90deg at 50% 50%,{dark} 25%,transparent 0 50%,{dark} 0 75%,transparent 0) 0 0/76px 76px;opacity:.5;transform:rotate(45deg) scale(2)"></div>
      <div style="position:absolute;inset:0;background:linear-gradient(135deg,#eef1f4,#b9c0c8);clip-path:{diagonal}"></div>
      {f'<div style="position:absolute;top:0;left:0;right:0;background:#D2003C;color:#fff;font-size:58px;text-align:center;padding:26px 0;letter-spacing:.2em">{band}</div>' if band else ''}
      <div style="position:absolute;left:12%;right:12%;top:30%">{word("#D2003C")}</div>
      <div style="position:absolute;left:13%;right:13%;top:48%">{bulls}</div>
      <div style="position:absolute;left:0;right:0;top:76%;text-align:center;color:#fff;font-size:88px;letter-spacing:.14em">{name}</div>
      <div style="position:absolute;left:0;right:0;bottom:4%;text-align:center;color:#fff;font-size:40px;opacity:.9">{tag}</div>
    </div>'''


def edition(bg, ink, bullc, title, flavour):
    return f'''<div class="p" style="background:{bg};color:{ink}">
      <div style="position:absolute;left:26%;right:2%;top:-3%;transform:scaleX(-1) rotate(-14deg)">{bull(bullc)}</div>
      <div style="position:absolute;left:26%;top:43%;font-size:64px">THE</div>
      <div style="position:absolute;left:26%;top:48%;font-size:168px;line-height:1;color:transparent;-webkit-text-stroke:5px {ink}">{title}</div>
      <div style="position:absolute;left:26%;top:60%;font-size:74px">EDITION</div>
      <div style="position:absolute;left:26%;right:5%;top:71%;font-size:48px;border-bottom:4px solid {ink};padding-bottom:8px">{flavour}</div>
      <div style="position:absolute;left:26%;bottom:5%;font-size:40px;line-height:1.25">ENERGY DRINK<br>Vitalizes body and mind&reg;<br>Caffeinated Beverage</div>
      <div style="position:absolute;left:-25%;bottom:27%;width:72%;transform:rotate(-90deg)">{word(ink)}</div>
    </div>'''


LABELS = {
    "energy-drink": [classic("#14296e", "#0c1a4d", "Vitalizes body and mind&reg;", "ENERGY DRINK", back=b) for b in (False, True)],
    "sugarfree": [classic("#22ace0", "#128fc4", "Vitalizes body and mind&reg;", "SUGARFREE", band="WITHOUT SUGAR", back=b) for b in (False, True)],
    "green-edition": [edition("#8cc63f", "#123c17", "#f3f9e5", "GREEN", "Curuba Elderflower")] * 2,
    "pink-edition": [edition("#f4a6c4", "#6b1239", "#fff5f8", "PINK", "White Peach")] * 2,
}

with sync_playwright() as pw:
    browser = pw.chromium.launch()
    page = browser.new_page(viewport={"width": W, "height": H})
    for name, (front, back) in LABELS.items():
        page.set_content(f'''<style>@font-face{{font-family:B;src:url(data:font/woff2;base64,{font})}}
          *{{margin:0;box-sizing:border-box}}body{{display:flex;width:{W}px;height:{H}px;font-family:B;overflow:hidden}}
          .p{{position:relative;width:50%;height:100%;overflow:hidden}}</style>{front}{back}''')
        page.wait_for_function("document.fonts.ready.then(()=>document.fonts.size>0)")
        page.wait_for_timeout(200)
        img = Image.open(io.BytesIO(page.screenshot())).convert("RGB")
        img.save(f"public/labels/{name}.webp", quality=88, method=6)
        print(name, Path(f"public/labels/{name}.webp").stat().st_size)
    browser.close()
