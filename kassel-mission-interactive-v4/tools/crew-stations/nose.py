"""B-24H/J nose compartment: navigator, bombardier and nose-turret gunner.

References (JP, Nov 18 2026): render of the navigator's seat with the
bombardier's Norden ahead; navigator's board render; NMUSAF B-24D bombardier
photo (framed green nose, Norden on its stand, oxygen regulator, wall
instrument box); Norden bombsight render. The 445th BG flew nose-turret
B-24H/Js at Kassel, so the framed glass nose of the B-24D photo is NOT
copied: the Emerson nose turret takes the tip, and the bombardier works
below and behind it through the flat sighting window, as on the H/J.
Dimensions are reconstruction estimates, not factory drawings.
Run: blender -b --python nose.py -- OUT.glb   (or bpy's python)
"""
import sys, math
import bpy  # noqa: F401  (loads mathutils)
from mathutils import Vector
import b24lib as L

out = sys.argv[sys.argv.index('--') + 1] if '--' in sys.argv else 'b24-nose-compartment.glb'
L.reset()
GREEN = L.mat('nose_bronze_green', tex='bronze_green', rough=.78, metal=.15)
FRAME = L.mat('nose_frame_green', color=(.075, .09, .045), rough=.6, metal=.25)
OD = L.mat('olive_drab', tex='olive_drab', rough=.72, metal=.1)
BLACK = L.mat('black_crinkle', tex='black_crinkle', rough=.6, metal=.25)
ALU = L.mat('aluminium', color=(.55, .56, .55), rough=.35, metal=.85)
STEEL = L.mat('gunmetal', color=(.05, .05, .055), rough=.35, metal=.8)
BRASS = L.mat('brass', color=(.55, .42, .16), rough=.35, metal=.85)
GLASS = L.mat('plexiglas', color=(.62, .72, .78), rough=.05, metal=0, alpha=.1)
NORDEN = L.mat('norden_enamel', tex='norden_black', rough=.4, metal=.35)
PAD = L.mat('green_padding', color=(.17, .2, .1), rough=.85, metal=0)
OXY = L.mat('oxygen_yellow', tex='oxygen', rough=.45, metal=.2)
CHART = L.mat('nav_chart', tex='nav_chart', rough=.9, metal=0)
GAUGES = L.mat('gauge_faces', tex='gauges', rough=.3, metal=0)
MAPCASE = L.mat('map_case', tex='map_case', rough=.7, metal=.1)
WHITE = L.mat('regulator_white', color=(.62, .63, .6), rough=.5, metal=.2)
HOSE = L.mat('hose_black', color=(.02, .02, .02), rough=.7, metal=0)
WIRE = L.mat('wiring_tan', color=(.42, .33, .17), rough=.7, metal=0)
RED = L.mat('red_knob', color=(.45, .03, .02), rough=.4, metal=.1)
DARK = L.mat('tunnel_dark', color=(.01, .012, .01), rough=1, metal=0)
FLOOR = L.mat('floor_plate', tex='olive_drab', rough=.8, metal=.2)

Y_AFT, Y_TUR = 1.10, 3.66
FLOOR_Z = -0.80


def lerp(a, b, t):
    return a + (b - a) * max(0, min(1, t))


def sec(y):
    t = (y - Y_AFT) / (Y_TUR - Y_AFT)
    a = lerp(0.98, 0.86, t); top = lerp(1.45, 1.18, t); bot = lerp(-1.02, -0.88, t)
    return (a, (top - bot) / 2, (top + bot) / 2, 3.0, None)


# ------------------------------------------------------------- windows
holes = []
holes.append(L.side_window(sec, +1, 2.33, 0.48, 0.80, 0.55, 0.12, FRAME, GLASS))   # navigator's window
holes.append(L.side_window(sec, -1, 2.25, 0.48, 0.70, 0.52, 0.12, FRAME, GLASS))   # left side window
holes.append(L.side_window(sec, +1, 3.08, 0.20, 0.52, 0.80, 0.10, FRAME, GLASS))   # right cheek window
holes.append(L.side_window(sec, -1, 3.08, 0.20, 0.52, 0.80, 0.10, FRAME, GLASS))   # left cheek window
astro = lambda y, x, z: (y - 1.55) ** 2 + x * x < 0.2 ** 2 and z > 1.0
holes.append(astro)

turret_hole = lambda y, x, z: z > -0.2 and x * x + (y - 4.2) ** 2 < 0.57 ** 2
L.shell(Y_AFT, Y_TUR, sec, GREEN, holes=holes + [turret_hole], name='skin')
L.shell(Y_AFT, Y_TUR, sec, GLASS, only=lambda y, x, z: any(h(y, x, z) for h in holes), thick=0, name='glass', step=0.04)

# formers (frames) between the windows, stringers above and below them
for y in (1.14, 1.5, 1.86, 2.78, 2.86, 3.4):
    L.ring_frame(y, sec, FRAME, depth=0.06, width=0.04, skip=lambda x, z, y=y: any(h(y, x, z) for h in holes))
for t in (0.0, 0.07, 0.93, 0.14, 0.86, 0.36, 0.64, 0.42, 0.58):
    L.stringer(Y_AFT, Y_TUR, sec, t, FRAME, size=(0.025, 0.02))
# astrodome
L.lathe([(0.2, 0), (0.2, 0.02), (0.19, 0.08), (0.16, 0.15), (0.1, 0.21), (0.0, 0.24)], (0, 1.55, 1.36), (0, 0, 1), GLASS, name='astrodome')
L.lathe([(0.2, 0), (0.235, 0), (0.235, 0.05), (0.2, 0.05)], (0, 1.55, 1.32), (0, 0, 1), FRAME, name='astro_ring')

# ------------------------------------------------------------- floor, bulkhead, tunnel
L.box((0, 2.2, FLOOR_Z - 0.02), (1.62, 2.3, 0.04), FLOOR, bevel=0.005, tile=0.8)
for x in (-0.6, -0.2, 0.2, 0.6):  # floor rib strips
    L.box((x, 2.2, FLOOR_Z + 0.002), (0.025, 2.2, 0.01), FRAME, bevel=0.003)
tunnel = lambda x, z: 0.05 < x < 0.62 and FLOOR_Z < z < -0.12
L.bulkhead(Y_AFT, sec, GREEN, holes=[tunnel], name='aft_bulkhead')
L.box((0.335, 0.7, -0.46), (0.6, 0.8, 0.7), DARK, bevel=0)      # crawlway beside nose wheel
L.sweep([(x, Y_AFT + 0.012, z) for (x, z) in [(0.05, FLOOR_Z), (0.05, -0.12), (0.62, -0.12), (0.62, FLOOR_Z)]], L.circle(0.02, 8), FRAME, name='tunnel_lip')
# nose-wheel well housing on the left (retracted nose gear lives here)
L.box((-0.38, 1.7, -0.52), (0.62, 1.2, 0.56), GREEN, bevel=0.08, segs=4, tile=0.6)
for y in (1.25, 1.6, 1.95, 2.25):
    L.box((-0.38, y, -0.235), (0.64, 0.025, 0.02), FRAME, bevel=0.005)

# ------------------------------------------------------------- navigator
# table along the right wall, drawers under (render 3), chart on top (render 4)
L.box((0.6, 2.35, -0.03), (0.58, 1.05, 0.035), OD, bevel=0.012)
L.panel((0.58, 2.33, -0.0115), 0.46, 0.78, CHART, normal=(0, 0, 1), up=(0, 1, 0))
L.box((0.52, 2.3, -0.009), (0.022, 0.34, 0.004), ALU, bevel=0.001)   # plotter
L.box((0.66, 2.6, -0.43), (0.42, 0.5, 0.74), OD, bevel=0.015)        # drawer cabinet
for i in range(4):
    z = -0.73 + i * 0.18
    L.box((0.445, 2.6, z), (0.012, 0.44, 0.15), OD, bevel=0.004)
    L.box((0.43, 2.6, z), (0.02, 0.12, 0.025), ALU, bevel=0.006)
L.panel((0.444, 2.6, -0.2), 0.3, 0.12, MAPCASE, normal=(-1, 0, 0), up=(0, 0, 1))
L.cyl((0.6, 1.9, -0.05), (0.6, 1.9, -0.8), 0.022, ALU)              # table leg
# wall instrument box (altimeter, airspeed, clock, compass) like the B-24D photo
L.box((0.84, 2.0, 0.62), (0.08, 0.36, 0.3), BLACK, bevel=0.015)
L.panel((0.795, 2.0, 0.62), 0.33, 0.165, GAUGES, normal=(-1, 0, 0), up=(0, 0, 1))
# gooseneck chart lamp
L.tube(L.bezier((0.85, 2.75, 0.2), (0.85, 2.75, 0.45), (0.7, 2.6, 0.55), (0.62, 2.5, 0.42), 14), 0.008, BLACK, segs=8)
L.lathe([(0.0, 0), (0.05, 0.0), (0.045, 0.06), (0.02, 0.08)], (0.62, 2.5, 0.36), (0, 0, 1), BLACK, segs=16)
# drift meter on the floor ahead of the table
L.cyl((0.45, 3.0, FLOOR_Z), (0.45, 3.0, -0.45), 0.09, BLACK, bevel=0.01)
L.cyl((0.45, 3.0, -0.45), (0.4, 2.95, -0.35), 0.035, BLACK)
# navigator's seat: padded swivel stool with back, on a post
L.cyl((0.12, 1.82, FLOOR_Z), (0.12, 1.82, -0.38), 0.03, ALU)
L.lathe([(0.0, 0), (0.2, 0), (0.205, 0.04), (0.19, 0.07), (0.0, 0.075)], (0.12, 1.82, -0.38), (0, 0, 1), PAD, segs=32)
L.box((0.12, 1.62, -0.1), (0.36, 0.06, 0.32), PAD, bevel=0.03, segs=3)
L.cyl((0.12, 1.65, -0.3), (0.12, 1.65, -0.24), 0.02, ALU)

# ------------------------------------------------------------- oxygen and services
for (x, y) in ((-0.78, 1.45), (-0.78, 2.7)):
    L.cyl((x, y, -0.62), (x, y, -0.18), 0.1, OXY, bevel=0.03)
    L.sphere((x, y, -0.18), 0.1, OXY, scale=(1, 1, 0.6))
    for z in (-0.5, -0.3):
        L.cyl((x, y, z - 0.012), (x, y, z + 0.012), 0.104, BLACK, cap=False)
# oxygen regulator panel (white box with gauges, as in the bombardier photo)
L.box((0.79, 3.1, 0.62), (0.1, 0.26, 0.24), WHITE, bevel=0.02)
for dz in (0.06, -0.06):
    L.cyl((0.74, 3.04, 0.62 + dz), (0.725, 3.04, 0.62 + dz), 0.045, ALU)
L.panel((0.722, 3.04, 0.62), 0.07, 0.17, GAUGES, normal=(-1, 0, 0), up=(0, 0, 1))
L.tube(L.bezier((0.76, 3.12, 0.5), (0.7, 3.2, 0.1), (0.4, 3.0, -0.2), (0.15, 2.95, -0.3), 18), 0.022, HOSE, segs=10)
# cable runs along both walls
for side in (-1, 1):
    for k, z in enumerate((0.95, 1.0, 1.05)):
        pts = [(side * (L.section_x(sec, y, z, 1) - 0.07), y, z) for y in [Y_AFT + 0.05 + i * 0.2 for i in range(12)]]
        L.tube(pts, 0.008 + 0.003 * k, WIRE if k else HOSE, segs=6)
# intervalometer / bomb control box on the left wall forward
L.box((-0.74, 2.95, 0.55), (0.1, 0.32, 0.22), BLACK, bevel=0.015)
for i in range(4):
    L.cyl((-0.69, 2.84 + i * 0.07, 0.6), (-0.66, 2.84 + i * 0.07, 0.62), 0.006, ALU)
L.cyl((-0.7, 3.05, 0.48), (-0.62, 3.05, 0.48), 0.012, ALU)
L.sphere((-0.62, 3.05, 0.48), 0.022, RED)

# ------------------------------------------------------------- bombardier & Norden
# chin below the turret with the flat optical sighting window
def chin_sec(y):
    t = (y - 3.4) / 0.62
    a = lerp(0.84, 0.36, t); top = -0.12; bot = lerp(-0.9, -0.66, t)
    return (a, (top - bot) / 2, (top + bot) / 2, 2.6, None)
L.shell(3.4, 4.02, chin_sec, GREEN, holes=[lambda y, x, z: z > -0.2], name='chin', step=0.03)
for y in (3.62, 3.84):
    L.ring_frame(y, chin_sec, FRAME, depth=0.045, width=0.035, skip=lambda x, z: z > -0.2)
L.panel((0, 4.02, -0.4), 0.62, 0.42, GLASS, normal=(0, 1, 0.2), up=(0, -0.2, 1))   # flat optical sighting window
L.window_frame([Vector((x, 4.02 - 0.2 * z, -0.4 + z)) for (x, z) in L.rrect(0.64, 0.44, 0.06)], FRAME, 0.022)
# Norden stand (pedestal) and sight: stabilizer below, sighthead above
L.cyl((0, 3.38, FLOOR_Z), (0, 3.38, -0.42), 0.045, NORDEN, bevel=0.01)
L.box((0, 3.38, -0.44), (0.24, 0.24, 0.035), NORDEN, bevel=0.01)
L.box((0, 3.43, -0.34), (0.34, 0.26, 0.17), NORDEN, bevel=0.035, segs=3)        # stabilizer
L.cyl((0.12, 3.43, -0.25), (0.12, 3.43, -0.24), 0.06, ALU)                      # stabilizer dial
L.sphere((0, 3.4, -0.16), 0.12, NORDEN, scale=(1.05, 0.95, 0.85))                # sighthead dome
L.box((0, 3.48, -0.17), (0.2, 0.16, 0.14), NORDEN, bevel=0.04, segs=3)
L.cyl((-0.125, 3.4, -0.16), (-0.14, 3.4, -0.16), 0.07, ALU)                      # side glass ring
L.panel((-0.141, 3.4, -0.16), 0.11, 0.11, GAUGES, normal=(-1, 0, 0), up=(0, 0, 1))
L.cyl((0.0, 3.32, -0.08), (0.0, 3.22, 0.02), 0.03, NORDEN)                         # eyepiece
L.cyl((0.0, 3.22, 0.02), (0.0, 3.2, 0.04), 0.04, BLACK)
for k, (x, r, mm) in enumerate(((0.13, 0.04, BRASS), (0.155, 0.032, ALU), (0.175, 0.028, ALU))):
    L.cyl((x, 3.36 + 0.02 * k, -0.2 + 0.03 * k), (x + 0.03, 3.36 + 0.02 * k, -0.2 + 0.03 * k), r, mm, bevel=0.004)
L.tube(L.bezier((0.15, 3.48, -0.32), (0.3, 3.5, -0.5), (0.35, 3.3, -0.7), (0.5, 3.1, -0.78), 14), 0.008, BLACK, segs=6)
# bombardier's seat (folding, padded) aft of the sight
L.box((0, 2.82, -0.48), (0.36, 0.3, 0.06), PAD, bevel=0.025, segs=3)
L.cyl((0, 2.82, FLOOR_Z), (0, 2.82, -0.52), 0.025, ALU)
# bomb release handle and pistol grip by the sight
L.cyl((0.3, 3.3, -0.4), (0.3, 3.3, -0.2), 0.012, STEEL)
L.sphere((0.3, 3.3, -0.19), 0.025, RED)

# ------------------------------------------------------------- nose turret (Emerson A-15), seen from inside
TC = Vector((0, 4.2, 0.42)); TR = 0.56
L.lathe([(TR + 0.06, 0), (TR + 0.06, 0.07), (TR, 0.07), (TR, 0)], (0, TC.y, -0.24), (0, 0, 1), FRAME, name='turret_ring')
L.lathe([(TR, 0), (TR, 1.1), (TR * 0.86, 1.28), (TR * 0.5, 1.38), (0, 1.41)], (0, TC.y, -0.17), (0, 0, 1), GLASS, segs=40, arc=(math.radians(-40), math.radians(220)), name='turret_glass')
for k in range(9):
    a = math.radians(-40 + 260 * k / 8)
    pts = [(TC.x + math.cos(a) * r, TC.y + math.sin(a) * r, -0.17 + h) for (r, h) in [(TR, 0), (TR, 1.1), (TR * 0.86, 1.28), (TR * 0.5, 1.38)]]
    L.tube(pts, 0.016, FRAME, segs=6)
for h in (0.0, 0.55, 1.1):
    pts = [(math.cos(math.radians(-40 + 260 * i / 40)) * (TR - 0.005), TC.y + math.sin(math.radians(-40 + 260 * i / 40)) * (TR - 0.005), -0.17 + h) for i in range(41)]
    L.tube(pts, 0.016, FRAME, segs=6)
# armoured rear doors (closed) facing the compartment
L.lathe([(TR - 0.01, 0), (TR - 0.01, 1.1), (TR * 0.8, 1.25)], (0, TC.y, -0.17), (0, 0, 1), GREEN, segs=20, arc=(math.radians(220), math.radians(320)), name='turret_doors')
L.box((0, TC.y - TR + 0.02, 0.45), (0.025, 0.03, 1.1), FRAME, bevel=0.004)
for s_ in (-1, 1):
    L.box((s_ * 0.12, TC.y - TR + 0.0, 0.55), (0.06, 0.03, 0.025), ALU, bevel=0.006)  # door handles
# armour glass and gunsight ahead of the gunner
L.panel((0, TC.y + 0.45, 0.62), 0.42, 0.34, GLASS, normal=(0, -1, 0), up=(0, 0, 1))
L.box((0, TC.y + 0.3, 0.6), (0.08, 0.1, 0.07), BLACK, bevel=0.015)
L.panel((0, TC.y + 0.3, 0.67), 0.08, 0.07, GLASS, normal=(0, -1, 0.5), up=(0, 0.5, 1))
# twin .50 cal breeches with feed chutes, and control handles
for s in (-1, 1):
    x = s * 0.26
    L.box((x, TC.y + 0.05, 0.5), (0.11, 0.62, 0.15), STEEL, bevel=0.012)
    L.cyl((x, TC.y + 0.36, 0.5), (x, TC.y + 1.3, 0.5), 0.026, STEEL)
    L.sweep(L.bezier((x, TC.y - 0.1, 0.5), (s * 0.45, TC.y - 0.1, 0.4), (s * 0.5, TC.y - 0.05, 0.0), (s * 0.4, TC.y + 0.1, -0.3), 12), [(-0.05, -0.012), (0.05, -0.012), (0.05, 0.012), (-0.05, 0.012)], ALU, name='feed_chute')
    L.cyl((s * 0.12, TC.y + 0.08, 0.2), (s * 0.12, TC.y + 0.08, 0.36), 0.018, BLACK)
    L.cyl((s * 0.12, TC.y + 0.08, 0.36), (s * 0.2, TC.y + 0.08, 0.36), 0.022, BLACK)
L.box((0, TC.y - 0.12, 0.08), (0.36, 0.3, 0.06), PAD, bevel=0.02)           # gunner's seat

# ------------------------------------------------------------- eyepoints (camera nodes)
L.eye('eye_nav', (0.14, 1.86, 0.42), (0.5, 0.75, -0.45))
L.eye('eye_bomb', (0.0, 2.72, 0.12), (0.0, 0.8, -0.6))
L.eye('eye_nose', (0.0, 4.2, 0.74), (0.0, 1.0, -0.06))
L.export(out)
print('wrote', out)
