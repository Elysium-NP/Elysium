# -*- coding: utf-8 -*-
"""Favicon Elysium : monogramme « E » serif (ice) sur fond sombre + accent diamant bleu.
Rend net à 32/48/180 px, contrairement au wordmark complet. Régénère les 3 fichiers."""
import os
from PIL import Image, ImageDraw, ImageFont

VOID = (10, 13, 18)      # #0A0D12 fond brand
ICE  = (234, 240, 247)   # #EAF0F7 lettre
BLUE = (46, 155, 255)    # #2E9BFF accent

# 1re police serif dispo (élégante, haute lisibilité en petit)
CANDS = [r"C:\Windows\Fonts\constanb.ttf", r"C:\Windows\Fonts\constan.ttf",
         r"C:\Windows\Fonts\georgiab.ttf", r"C:\Windows\Fonts\timesbd.ttf",
         r"C:\Windows\Fonts\georgia.ttf", r"C:\Windows\Fonts\times.ttf"]
FONT = next((p for p in CANDS if os.path.exists(p)), None)
assert FONT, "aucune police serif trouvée dans C:\\Windows\\Fonts"


def render(px, out):
    S = px * 4                                   # supersampling -> bords lisses
    im = Image.new("RGBA", (S, S), VOID + (255,))
    d = ImageDraw.Draw(im)
    # « E » centré optiquement
    f = ImageFont.truetype(FONT, int(S * 0.74))
    b = d.textbbox((0, 0), "E", font=f)
    w, h = b[2] - b[0], b[3] - b[1]
    d.text(((S - w) / 2 - b[0], (S - h) / 2 - b[1] - S * 0.02), "E", font=f, fill=ICE)
    # accent diamant bleu (motif du logo) bas-droite
    c = S * 0.80
    r = S * 0.052
    d.polygon([(c, c - r), (c + r, c), (c, c + r), (c - r, c)], fill=BLUE)
    im = im.resize((px, px), Image.LANCZOS)
    im.save(out)
    print("écrit", out, "%dx%d" % (px, px))


render(32, "assets/favicon-32.png")
render(48, "assets/favicon-48.png")
render(180, "assets/apple-touch-icon.png")
print("OK")
