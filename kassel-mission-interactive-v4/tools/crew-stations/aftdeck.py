"""B-24H/J aft flight deck: radio operator's station and the top-turret bay.

Joins the refined flight-deck model behind the pilots' seats (same frame).
On the B-24D through J-175 the radio operator sat on the RIGHT, behind the
co-pilot, with his table facing outboard against the right wall and the
Martin upper turret just behind him (Project Warbird restoration notes;
JP's NMUSAF photos: olive table, BC-348 receiver, RADIO INDICATOR hood,
BC-375 transmitter below, yellow oxygen bottle, junction boxes, wiring,
green padded swivel seat). Dimensions are reconstruction estimates.
"""
import sys, math
import bpy  # noqa: F401
from mathutils import Vector, Euler
import b24lib as L

out = sys.argv[sys.argv.index('--') + 1] if '--' in sys.argv else 'b24-aft-deck.glb'
L.reset()
GREEN = L.mat('deck_bronze_green', tex='bronze_green', rough=.78, metal=.15)
FRAME = L.mat('deck_frame', color=(.07, .085, .045), rough=.6, metal=.25)
OD = L.mat('olive_drab', tex='olive_drab', rough=.72, metal=.1)
FLOOR = L.mat('deck_floor', tex='olive_drab', rough=.8, metal=.2)
BLACK = L.mat('black_crinkle', tex='black_crinkle', rough=.6, metal=.25)
ALU = L.mat('aluminium', color=(.55, .56, .55), rough=.35, metal=.85)
STEEL = L.mat('gunmetal', color=(.05, .05, .055), rough=.35, metal=.8)
GLASS = L.mat('plexiglas', color=(.62, .72, .78), rough=.05, metal=0, alpha=.1)
PAD = L.mat('green_padding', color=(.2, .24, .13), rough=.8, metal=0)
OXY = L.mat('oxygen_yellow', tex='oxygen', rough=.45, metal=.2)
RX = L.mat('bc348_front', tex='bc348_front', rough=.5, metal=.2)
TX = L.mat('bc375_front', tex='bc375_front', rough=.5, metal=.2)
JB = L.mat('junction_box', tex='junction_box', rough=.6, metal=.15)
RI = L.mat('radio_indicator', tex='radio_indicator', rough=.6, metal=.15)
GAUGES = L.mat('gauge_faces', tex='gauges', rough=.3, metal=0)
WIRE = L.mat('wiring_tan', color=(.42, .33, .17), rough=.7, metal=0)
WIRER = L.mat('wiring_red', color=(.4, .05, .04), rough=.6, metal=0)
HOSE = L.mat('hose_black', color=(.02, .02, .02), rough=.7, metal=0)
RED = L.mat('extinguisher_red', color=(.45, .04, .03), rough=.4, metal=.2)
DARK = L.mat('bay_dark', color=(.01, .012, .01), rough=1, metal=0)
WOOD = L.mat('plywood', tex='plywood', rough=.75, metal=0)

Y0, Y1 = -0.90, -2.75          # fore end overlaps the flight deck shell, aft bulkhead


def sec(y):
    return (1.0, 0.84, 0.84, 3.0, 0.0)


holes = [L.side_window(sec, +1, -1.4, 1.12, 0.5, 0.36, 0.1, FRAME, GLASS),     # radio operator's window
         L.side_window(sec, -1, -1.35, 1.12, 0.46, 0.34, 0.1, FRAME, GLASS)]
turret = lambda y, x, z: z > 1.35 and x * x + (y + 2.15) ** 2 < 0.5 ** 2
L.shell(Y1, Y0, sec, GREEN, holes=holes + [turret], name='skin')
L.shell(Y1, Y0, sec, GLASS, only=lambda y, x, z: any(h(y, x, z) for h in holes), thick=0, name='glass')
for y in (-1.02, -1.75, -2.4, -2.72):
    L.ring_frame(y, sec, FRAME, depth=0.06, width=0.04, skip=lambda x, z, y=y: any(h(y, x, z) for h in holes) or turret(y, x, z))
for t in (0.06, 0.94, 0.15, 0.85, 0.36, 0.64):
    L.stringer(Y1, Y0, sec, t, FRAME, size=(0.024, 0.02))
L.box((0, (Y0 + Y1) / 2, -0.02), (1.98, abs(Y1 - Y0), 0.04), FLOOR, bevel=0.004, tile=0.9)
for x in (-0.5, 0, 0.5):
    L.box((x, (Y0 + Y1) / 2, 0.002), (0.03, abs(Y1 - Y0), 0.008), FRAME, bevel=0.002)

# aft bulkhead with the door into the bomb bay catwalk
door = lambda x, z: abs(x) < 0.3 and 0.0 < z < 1.45 and (z < 1.2 or x * x + (z - 1.2) ** 2 < 0.3 ** 2)
L.bulkhead(Y1, sec, GREEN, holes=[door], name='aft_bulkhead')
L.box((0, Y1 - 0.5, 0.75), (0.7, 0.9, 1.5), DARK, bevel=0)
pts = [(0.3, Y1 + 0.012, 0)] + [(0.3 * math.cos(a), Y1 + 0.012, 1.2 + 0.3 * math.sin(a)) for a in [math.radians(d) for d in range(0, 181, 15)]] + [(-0.3, Y1 + 0.012, 0)]
L.tube(pts, 0.02, FRAME, segs=8)

# ------------------------------------------------------------- radio operator (right wall)
TOP = 0.74
table = L.rounded_poly([(1.0, -0.98), (0.42, -0.98), (0.36, -1.08), (0.36, -1.66), (0.44, -1.78), (1.0, -1.78)], 0.05)
L.slab(table, TOP, 0.028, OD, bevel=0.008)
L.box((0.39, -1.38, TOP - 0.05), (0.02, 0.7, 0.07), OD, bevel=0.006)     # front lip
for y in (-1.0, -1.76):
    L.tube([(0.42, y, TOP - 0.02), (0.42, y, 0.02)], 0.016, ALU, segs=10)
L.tube([(0.42, -1.0, 0.25), (0.42, -1.76, 0.25)], 0.012, ALU, segs=8)
# BC-348 liaison receiver on its FT-154 mount at the back of the table
L.box((0.8, -1.32, TOP + 0.02), (0.34, 0.5, 0.03), BLACK, bevel=0.006)
L.box((0.82, -1.32, TOP + 0.165), (0.32, 0.46, 0.26), BLACK, bevel=0.01)
L.panel((0.659, -1.32, TOP + 0.165), 0.46, 0.25, RX, normal=(-1, 0, 0), up=(0, 0, 1))
for k, y in enumerate((-1.48, -1.4, -1.22, -1.16)):
    L.cyl((0.655, y, TOP + 0.08 + 0.1 * (k % 2)), (0.63, y, TOP + 0.08 + 0.1 * (k % 2)), 0.016, BLACK)
# radio compass indicator: angled housing with a viewing hood, aft end of the table
ind = Vector((0.66, -1.66, TOP + 0.16))
L.box(ind, (0.2, 0.16, 0.2), OD, bevel=0.02, rot=Euler((0, math.radians(-25), 0)))
L.panel((0.555, -1.66, TOP + 0.21), 0.15, 0.075, RI, normal=(-1, 0, 0.3), up=(0.3, 0, 1))
L.cyl((0.6, -1.66, TOP + 0.2), (0.48, -1.66, TOP + 0.26), 0.06, OD, cap=False)
L.box((0.7, -1.66, TOP + 0.02), (0.18, 0.16, 0.04), OD, bevel=0.01)
# small key and log board on the table
L.box((0.5, -1.15, TOP + 0.012), (0.12, 0.08, 0.012), WOOD, bevel=0.003)
L.box((0.5, -1.15, TOP + 0.03), (0.05, 0.03, 0.02), BLACK, bevel=0.004)
# BC-375 transmitter / control unit under the table
L.box((0.75, -1.32, 0.33), (0.38, 0.48, 0.6), BLACK, bevel=0.012)
L.panel((0.559, -1.32, 0.33), 0.46, 0.58, TX, normal=(-1, 0, 0), up=(0, 0, 1))
L.tube(L.bezier((0.56, -1.12, 0.45), (0.45, -1.0, 0.5), (0.45, -0.95, 0.65), (0.6, -0.95, TOP), 12), 0.01, ALU, segs=6)
# junction box and switch boxes on the wall above / aft of the table
L.box((0.94, -1.72, 0.98), (0.1, 0.24, 0.12), OD, bevel=0.01)
L.panel((0.885, -1.72, 0.98), 0.23, 0.115, JB, normal=(-1, 0, 0), up=(0, 0, 1))
L.box((0.93, -1.0, 1.08), (0.1, 0.16, 0.16), BLACK, bevel=0.012)
L.panel((0.875, -1.0, 1.08), 0.12, 0.06, GAUGES, normal=(-1, 0, 0), up=(0, 0, 1))
for k in range(3):
    L.cyl((0.88, -0.96 - 0.04 * k, 1.03), (0.86, -0.96 - 0.04 * k, 1.03), 0.008, ALU)
# wiring looms along the right wall and over the window
for k, (m, z) in enumerate(((WIRE, 1.38), (WIRER, 1.42), (WIRE, 1.46), (HOSE, 0.86))):
    pts = [(L.section_x(sec, y, z, 1) - 0.07 - 0.01 * k, y, z) for y in [Y0 - 0.05 - i * 0.16 for i in range(12)]]
    L.tube(pts, 0.009 + 0.002 * (k % 2), m, segs=6)
L.tube(L.bezier((0.9, -1.0, 1.38), (0.92, -1.0, 1.2), (0.92, -1.0, 1.18), (0.93, -1.0, 1.16), 8), 0.009, WIRE, segs=6)
# oxygen bottle forward of the table, beside the co-pilot's seat armour
L.cyl((0.84, -0.96, 0.82), (0.84, -0.96, 1.18), 0.085, OXY, bevel=0.025)
L.sphere((0.84, -0.96, 1.18), 0.085, OXY, scale=(1, 1, .6))
for z in (0.9, 1.1):
    L.cyl((0.84, -0.96, z - 0.01), (0.84, -0.96, z + 0.01), 0.089, BLACK, cap=False)
L.tube(L.bezier((0.84, -0.96, 1.23), (0.7, -0.95, 1.3), (0.6, -1.0, 1.0), (0.55, -1.1, 0.8), 12), 0.014, HOSE, segs=8)
# operator's green padded swivel seat on a post
L.cyl((0.18, -1.38, 0.0), (0.18, -1.38, 0.4), 0.035, ALU)
L.lathe([(0.0, 0), (0.2, 0), (0.21, 0.045), (0.195, 0.085), (0.0, 0.09)], (0.18, -1.38, 0.4), (0, 0, 1), PAD, segs=32)
L.lathe([(0.0, 0), (0.22, 0), (0.22, 0.012), (0.0, 0.012)], (0.18, -1.38, 0.0), (0, 0, 1), ALU, segs=24)

# ------------------------------------------------------------- engineer side (left) and top turret
L.box((-0.93, -1.9, 0.9), (0.08, 0.36, 0.3), BLACK, bevel=0.015)      # fuel transfer / gauges
L.panel((-0.885, -1.9, 0.92), 0.33, 0.165, GAUGES, normal=(1, 0, 0), up=(0, 0, 1))
L.cyl((-0.82, -1.05, 0.05), (-0.82, -1.05, 0.5), 0.07, RED, bevel=0.02)  # fire extinguisher
L.cyl((-0.82, -1.05, 0.5), (-0.82, -1.05, 0.58), 0.025, ALU)
L.box((-0.9, -2.45, 0.4), (0.14, 0.4, 0.8), OD, bevel=0.015)         # ammo boxes for the turret
L.box((-0.9, -2.45, 0.82), (0.14, 0.38, 0.04), ALU, bevel=0.006)
# Martin upper turret: ring in the roof, glazed dome above, pedestal and stand below
TY = -2.15
L.lathe([(0.47, 0), (0.54, 0), (0.54, 0.08), (0.47, 0.08)], (0, TY, 1.38), (0, 0, 1), ALU, segs=48, name='turret_ring')
L.lathe([(0.47, 0), (0.47, 0.28), (0.44, 0.45), (0.33, 0.62), (0.16, 0.72), (0.0, 0.74)], (0, TY, 1.46), (0, 0, 1), GLASS, segs=40)
for k in range(8):
    a = 2 * math.pi * k / 8
    L.tube([(math.cos(a) * r, TY + math.sin(a) * r, 1.46 + h) for (r, h) in [(0.47, 0), (0.47, 0.28), (0.44, 0.45), (0.33, 0.62)]], 0.012, FRAME, segs=6)
L.lathe([(0.0, 0), (0.42, 0), (0.42, 0.22), (0.0, 0.22)], (0, TY, 1.25), (0, 0, 1), FRAME, segs=40, arc=(math.radians(200), math.radians(340)))
for s in (-1, 1):  # gun breeches inside the dome
    L.box((s * 0.18, TY + 0.05, 1.72), (0.1, 0.55, 0.13), STEEL, bevel=0.01)
    L.cyl((s * 0.18, TY + 0.33, 1.72), (s * 0.18, TY + 1.1, 1.72), 0.024, STEEL)
L.cyl((0, TY, 0.0), (0, TY, 1.25), 0.06, ALU)                         # central column
L.box((0, TY, 0.62), (0.42, 0.3, 0.05), ALU, bevel=0.01)              # gunner's step
L.box((0, TY - 0.05, 1.05), (0.34, 0.3, 0.06), PAD, bevel=0.02)       # sling seat
L.tube([(-0.22, TY - 0.2, 1.05), (-0.22, TY - 0.2, 1.3)], 0.015, ALU)
L.tube([(0.22, TY - 0.2, 1.05), (0.22, TY - 0.2, 1.3)], 0.015, ALU)

# ------------------------------------------------------------- eyepoints
L.eye('eye_radio', (0.2, -1.38, 1.2), (1.0, 0.05, -0.42))
L.export(out)
print('wrote', out)
