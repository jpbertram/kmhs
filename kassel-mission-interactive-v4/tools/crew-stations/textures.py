"""Authored surface textures for the B-24 crew-station models.

Run with any Python 3 that has Pillow:  python3 textures.py OUTDIR
Everything is drawn here (no photographs are used as surfaces). Colours are
taken by eye from JP's reference photos of preserved B-24s (zinc-chromate
waist, bronze-green nose and flight deck, olive-drab radio table, black
crinkle radio sets). Panel and placard wording is generic period-style
lettering, not transcribed from a specific airframe.
"""
import math, os, random, sys
from PIL import Image, ImageDraw, ImageFilter, ImageFont

OUT = sys.argv[1] if len(sys.argv) > 1 else 'tex'
os.makedirs(OUT, exist_ok=True)
FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
FONT_C = next((p for p in ['/usr/share/fonts/truetype/dejavu/DejaVuSansCondensed-Bold.ttf', '/usr/share/fonts/truetype/freefont/FreeSansBold.ttf'] if os.path.exists(p)), FONT)
MONO = '/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf'


def font(size, f=FONT):
    return ImageFont.truetype(f, size)


def noise_layer(size, seed, scale=6, amp=18):
    rnd = random.Random(seed)
    small = Image.new('L', (max(2, size // scale), max(2, size // scale)))
    small.putdata([128 + int(rnd.gauss(0, amp)) for _ in range(small.width * small.height)])
    return small.resize((size, size), Image.BICUBIC).filter(ImageFilter.GaussianBlur(scale / 2))


def tint(base, size, seed, amp=14, grain=6):
    """Painted metal: base colour with low-frequency mottling and grain."""
    img = Image.new('RGB', (size, size), base)
    lo = noise_layer(size, seed, 32, amp)
    hi = noise_layer(size, seed + 1, 2, grain)
    px = img.load(); a = lo.load(); b = hi.load()
    for y in range(size):
        for x in range(size):
            d = (a[x, y] - 128) + (b[x, y] - 128) * 0.6
            r, g, bb = base
            px[x, y] = (max(0, min(255, int(r + d))), max(0, min(255, int(g + d))), max(0, min(255, int(bb + d * 0.8))))
    return img


def scratches(img, seed, n, colour, length=40, width=1):
    d = ImageDraw.Draw(img); rnd = random.Random(seed)
    for _ in range(n):
        x, y = rnd.random() * img.width, rnd.random() * img.height
        a = rnd.random() * math.pi; L = rnd.random() * length
        d.line([(x, y), (x + math.cos(a) * L, y + math.sin(a) * L)], fill=colour, width=width)


def rivet_panels(img, seed, rows, cols, rivet, seam, spacing=14):
    """Skin panels: seams with rivet rows, wrapped so the texture tiles."""
    d = ImageDraw.Draw(img); W, H = img.size
    for i in range(rows + 1):
        y = int(i * H / rows) % H
        d.line([(0, y), (W, y)], fill=seam, width=2)
        for x in range(4, W, spacing):
            for yy in (y - 5, y + 5):
                d.ellipse([x - 1.6, yy - 1.6, x + 1.6, yy + 1.6], fill=rivet)
    for j in range(cols + 1):
        x = int(j * W / cols) % W
        d.line([(x, 0), (x, H)], fill=seam, width=2)
        for y in range(4, H, spacing):
            d.ellipse([x + 4 - 1.6, y - 1.6, x + 4 + 1.6, y + 1.6], fill=rivet)


def grime(img, seed, strength=40):
    g = noise_layer(img.width, seed, 64, 40).point(lambda v: max(0, v - 128) * strength // 40)
    dark = Image.new('RGB', img.size, (30, 28, 20))
    return Image.composite(dark, img, g)


def save(img, name):
    img.save(os.path.join(OUT, name + '.png'), optimize=True)


# 1. Zinc-chromate yellow-green (waist, aft fuselage) with panels and rivets.
zc = tint((176, 190, 78), 512, 10, 12, 5)
rivet_panels(zc, 11, 2, 2, (150, 160, 62), (140, 150, 58))
scratches(zc, 12, 40, (186, 196, 96), 24)
save(grime(zc, 13, 26), 'zinc_chromate')

# 2. Bronze green interior (nose compartment, flight deck aft, radio station).
bg = tint((84, 94, 52), 512, 20, 10, 5)
rivet_panels(bg, 21, 2, 2, (70, 78, 42), (64, 72, 38))
scratches(bg, 22, 45, (100, 108, 68), 24)
save(grime(bg, 23, 30), 'bronze_green')

# 3. Olive drab equipment paint with chipped edges (desk top, boxes).
od = tint((92, 104, 56), 512, 30, 16, 6)
scratches(od, 31, 90, (124, 130, 90), 22)
scratches(od, 32, 40, (72, 80, 46), 40)
d = ImageDraw.Draw(od); rnd = random.Random(33)
for _ in range(90):  # paint chips showing primer/metal
    x, y = rnd.random() * 512, rnd.random() * 512; r = rnd.random() * 5 + 1
    d.ellipse([x - r, y - r * 0.6, x + r, y + r * 0.6], fill=(150, 146, 120))
save(grime(od, 34, 34), 'olive_drab')

# 4. Black crinkle finish for radio sets and junction boxes.
bk = tint((26, 27, 27), 256, 40, 5, 9)
scratches(bk, 41, 25, (44, 44, 43), 14)
save(bk, 'black_crinkle')

# 5. Plywood floor / kick panels.
wd = Image.new('RGB', (512, 512), (110, 62, 36)); px = wd.load(); rnd = random.Random(50)
lo = noise_layer(512, 51, 24, 22).load()
for y in range(512):
    for x in range(512):
        grain = math.sin((y * 0.09) + math.sin(x * 0.012) * 3 + (lo[x, y] - 128) * 0.04) * 12
        v = (lo[x, y] - 128) * 0.4 + grain
        px[x, y] = (int(112 + v), int(64 + v * 0.6), int(38 + v * 0.4))
scratches(wd, 52, 30, (124, 78, 48), 40)
save(grime(wd, 53, 30), 'plywood')

# 6. Rubber floor mat.
mt = tint((28, 28, 27), 256, 60, 4, 7)
d = ImageDraw.Draw(mt)
for y in range(0, 256, 8):
    d.line([(0, y), (256, y)], fill=(20, 20, 20), width=2)
save(mt, 'rubber_mat')

# 7. Oxygen bottle (type A-4/A-6 style): yellow with black band and stencil.
ox = tint((214, 168, 18), 512, 70, 8, 4)
d = ImageDraw.Draw(ox)
d.rectangle([0, 60, 512, 92], fill=(24, 24, 22))
f = font(19, FONT_C)
for i, t in enumerate(['BREATHING OXYGEN', 'LOW PRESSURE', '400 LBS. MAX', 'U.S. ARMY AIR FORCES']):
    for k in (0, 256):
        d.text((k + 18, 150 + i * 40), t, fill=(30, 28, 18), font=f)
scratches(ox, 71, 20, (226, 186, 60))
save(ox, 'oxygen')


def dial(d, cx, cy, r, ticks=40, label='', needle=0.3, face=(14, 15, 15), ink=(222, 220, 205), f=None):
    d.ellipse([cx - r - 4, cy - r - 4, cx + r + 4, cy + r + 4], fill=(70, 72, 70))
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=face)
    for i in range(ticks + 1):
        a = math.radians(225 - 270 * i / ticks)
        r0 = r * (0.78 if i % 5 else 0.68)
        d.line([(cx + math.cos(a) * r0, cy - math.sin(a) * r0), (cx + math.cos(a) * r * 0.92, cy - math.sin(a) * r * 0.92)], fill=ink, width=2)
    if label and f:
        w = d.textlength(label, font=f); d.text((cx - w / 2, cy + r * 0.3), label, fill=ink, font=f)
    a = math.radians(225 - 270 * needle)
    d.line([(cx, cy), (cx + math.cos(a) * r * 0.75, cy - math.sin(a) * r * 0.75)], fill=(240, 236, 220), width=3)
    d.ellipse([cx - 4, cy - 4, cx + 4, cy + 4], fill=ink)


def knob(d, cx, cy, r):
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(12, 12, 12), outline=(80, 80, 78), width=2)
    d.line([(cx, cy - r + 2), (cx, cy - r * 0.3)], fill=(200, 200, 190), width=2)


# 8. BC-348 receiver front panel (2:1).
rx = tint((22, 23, 23), 1024, 80, 4, 8).crop((0, 0, 1024, 512))
d = ImageDraw.Draw(rx); f = font(18, FONT_C); fs = font(14, FONT_C)
d.rectangle([4, 4, 1019, 507], outline=(55, 56, 55), width=4)
# big tuning dial window with scale arc (the "fan" window in the photos)
d.pieslice([330, 70, 690, 430], 200, 340, fill=(190, 182, 150), outline=(70, 70, 68), width=6)
d.pieslice([380, 120, 640, 380], 200, 340, fill=(22, 23, 23))
for i in range(31):
    a = math.radians(200 + 140 * i / 30)
    d.line([(510 + math.cos(a) * 170, 250 + math.sin(a) * 170), (510 + math.cos(a) * (150 if i % 5 else 138), 250 + math.sin(a) * (150 if i % 5 else 138))], fill=(30, 30, 28), width=2)
d.line([(510, 250), (510 + math.cos(math.radians(255)) * 172, 250 + math.sin(math.radians(255)) * 172)], fill=(150, 20, 16), width=4)
knob(d, 510, 330, 56)
for (x, y, t) in [(110, 120, 'C.W. OSC.'), (110, 300, 'OUTPUT'), (250, 400, 'MV.C.'), (850, 120, 'DIAL LIGHTS'), (850, 300, 'BAND SWITCH'), (770, 420, 'VOLUME')]:
    knob(d, x, y + 40, 30); w = d.textlength(t, font=fs); d.text((x - w / 2, y - 8), t, fill=(214, 210, 192), font=fs)
d.rectangle([600, 400, 720, 470], fill=(170, 160, 120), outline=(90, 88, 80), width=3)
for i, t in enumerate(['SIGNAL CORPS  U.S. ARMY', 'RADIO RECEIVER', 'BC-348']):
    d.text((608, 406 + i * 20), t, fill=(30, 28, 22), font=font(11, FONT_C))
d.rectangle([900, 420, 960, 470], fill=(170, 40, 30))
d.text((150, 20), 'RADIO RECEIVER', fill=(210, 206, 190), font=f)
save(rx, 'bc348_front')

# 9. BC-375 transmitter / tuning unit front (louvers, meters, knobs).
tx = tint((22, 23, 23), 1024, 90, 4, 8).crop((0, 0, 1024, 512))
d = ImageDraw.Draw(tx)
d.rectangle([4, 4, 1019, 507], outline=(55, 56, 55), width=4)
for row in range(5):
    for col in range(3):
        x0, y0 = 40 + col * 150, 40 + row * 60
        d.rounded_rectangle([x0, y0, x0 + 120, y0 + 26], 10, fill=(8, 8, 8), outline=(70, 70, 68), width=2)
dial(d, 640, 120, 62, 40, 'PLATE MA', 0.42, f=fs)
dial(d, 860, 120, 62, 40, 'ANT. AMPS', 0.3, f=fs)
for i, x in enumerate([560, 700, 840, 960]):
    knob(d, x, 360, 34)
d.rectangle([90, 380, 290, 470], fill=(180, 170, 130), outline=(90, 88, 80), width=3)
d.text((100, 392), 'TRANSMITTER', fill=(30, 28, 22), font=fs)
d.text((100, 414), 'BC-375', fill=(30, 28, 22), font=fs)
d.rectangle([320, 400, 380, 440], fill=(170, 40, 30))
save(tx, 'bc375_front')

# 10. Junction box / control box lids with stencils.
jb = tint((70, 82, 46), 512, 100, 8, 6).crop((0, 0, 512, 256))
d = ImageDraw.Draw(jb)
d.rectangle([6, 6, 505, 249], outline=(40, 46, 26), width=6)
d.text((40, 100), 'JUNCTION BOX', fill=(222, 218, 196), font=font(40, FONT_C))
for x in (20, 486):
    for y in (20, 230):
        d.ellipse([x - 6, y - 6, x + 6, y + 6], fill=(46, 50, 32))
save(jb, 'junction_box')

# 11. Radio compass indicator housing label.
ri = tint((78, 92, 52), 512, 110, 8, 6).crop((0, 0, 512, 256))
d = ImageDraw.Draw(ri)
d.text((70, 60), 'RADIO', fill=(226, 224, 206), font=font(54, FONT_C))
d.text((70, 128), 'INDICATOR', fill=(226, 224, 206), font=font(54, FONT_C))
save(ri, 'radio_indicator')

# 12. Instrument faces sheet (4x2 dials) for small gauge boxes.
gs = Image.new('RGB', (1024, 512), (16, 16, 16)); d = ImageDraw.Draw(gs)
labels = ['ALTITUDE', 'AIR SPEED', 'CLOCK', 'COMPASS', 'OXYGEN', 'SUCTION', 'TEMP', 'DRIFT']
for i, lab in enumerate(labels):
    cx, cy = 128 + (i % 4) * 256, 128 + (i // 4) * 256
    dial(d, cx, cy, 108, 40, lab, 0.2 + 0.08 * i, f=fs)
save(gs, 'gauges')

# 13. Navigator's chart (Mercator-style with plotted course).
ch = Image.new('RGB', (1024, 768), (208, 196, 160)); d = ImageDraw.Draw(ch)
lo = noise_layer(1024, 120, 48, 10).resize((1024, 768)).load()
px = ch.load()
for y in range(768):
    for x in range(1024):
        v = lo[x, y] - 128
        r, g, b = px[x, y]; px[x, y] = (r + v, g + v, b + v)
rnd = random.Random(121)
for k in range(9):  # coastline / river wiggles
    pts = []; x, y = rnd.random() * 1024, rnd.random() * 768
    for _ in range(60):
        x += rnd.gauss(0, 14); y += rnd.gauss(0, 14); pts.append((x, y))
    d.line(pts, fill=(80, 110, 150) if k < 4 else (130, 110, 80), width=2)
for x in range(0, 1024, 96):
    d.line([(x, 0), (x, 768)], fill=(150, 120, 110), width=1)
for y in range(0, 768, 96):
    d.line([(0, y), (1024, y)], fill=(150, 120, 110), width=1)
route = [(120, 640), (300, 520), (520, 470), (700, 300), (860, 180)]
d.line(route, fill=(40, 40, 120), width=4)
for (x, y) in route:
    d.ellipse([x - 9, y - 9, x + 9, y + 9], outline=(160, 30, 30), width=3)
d.text((710, 160), 'IP', fill=(160, 30, 30), font=font(26))
d.text((880, 150), 'TGT', fill=(160, 30, 30), font=font(26))
d.rectangle([20, 20, 300, 90], outline=(60, 50, 40), width=2)
d.text((30, 30), 'SHEET 3  GERMANY', fill=(60, 50, 40), font=font(22))
d.line([(200, 300), (420, 120)], fill=(30, 30, 30), width=2)  # pencil plot
save(ch, 'nav_chart')

# 14. Norden bombsight body: blue-black enamel with brass/aluminium detail flecks.
nb = tint((20, 22, 30), 256, 130, 4, 7)
scratches(nb, 131, 16, (44, 46, 54), 12)
save(nb, 'norden_black')

# 15. Ammunition belt: links with brass cases and steel bullets (tiles vertically).
am = Image.new('RGB', (128, 256), (90, 92, 92)); d = ImageDraw.Draw(am)
for i in range(8):
    y = i * 32
    d.rectangle([4, y + 2, 124, y + 28], fill=(140, 142, 140))
    d.rectangle([28, y + 8, 100, y + 22], fill=(178, 140, 60))
    d.polygon([(100, y + 8), (124, y + 15), (100, y + 22)], fill=(110, 110, 112))
    d.line([(4, y + 30), (124, y + 30)], fill=(60, 60, 60), width=2)
save(am, 'ammo_belt')

# 16. Map case / drawer stencil plate for navigator desk.
mc = tint((60, 62, 46), 256, 140, 6, 5); d = ImageDraw.Draw(mc)
d.text((48, 108), 'MAP CASE', fill=(200, 196, 170), font=font(30, FONT_C))
save(mc, 'map_case')

# 17. Hatch / waist window cover (light grey-white interior paint).
wc = tint((206, 206, 198), 256, 150, 6, 4)
scratches(wc, 151, 18, (186, 186, 178))
save(wc, 'hatch_grey')
print('textures written to', OUT)
