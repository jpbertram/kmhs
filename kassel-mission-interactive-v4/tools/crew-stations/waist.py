"""B-24H/J waist gunners' compartment.

From JP's NMUSAF photos: zinc-chromate yellow-green structure with deep
formers and stringers, .50 cal M2 guns on K-6 mounts, ammunition
belts riding up to the guns, yellow oxygen bottles below the windows, brown
plywood kick panels, corrugated floor with black mats. Same frame as the
flight deck (metres, Y forward). Station positions follow the existing
mission reconstruction; dimensions are estimates, not factory drawings.

Kassel-era fit (27 Sep 1944): the 445th's B-24Hs and Js flew with the waist
positions enclosed: framed Plexiglas windows with the gun on a K-6 mount at
the sill, its barrel through a booted port in the glazing (B-24 variant notes
on kasselmission.org and Warbirds Resource Group). The open windows with the
hatch covers swung up under the roof seen in museum photos are the earlier
arrangement and are not modelled.
"""
import sys, math
import bpy  # noqa: F401
import bmesh
from mathutils import Vector, Euler
import b24lib as L

out = sys.argv[sys.argv.index('--') + 1] if '--' in sys.argv else 'b24-waist.glb'
L.reset()
ZC = L.mat('zinc_chromate', tex='zinc_chromate', rough=.7, metal=.15)
ZCF = L.mat('zinc_frame', color=(.42, .47, .13), rough=.6, metal=.2)
WOOD = L.mat('plywood', tex='plywood', rough=.75, metal=0)
MAT = L.mat('rubber_mat', tex='rubber_mat', rough=.9, metal=0)
FLOOR = L.mat('floor_corrugated', color=(.5, .52, .5), rough=.45, metal=.75)
STEEL = L.mat('gunmetal', color=(.05, .05, .055), rough=.35, metal=.8)
PARK = L.mat('parkerized', color=(.11, .1, .09), rough=.55, metal=.6)
JACKET = L.mat('barrel_jacket', color=(.2, .17, .12), rough=.45, metal=.7)
OXY = L.mat('oxygen_yellow', tex='oxygen', rough=.45, metal=.2)
BLACK = L.mat('black_crinkle', tex='black_crinkle', rough=.6, metal=.25)
AMMO = L.mat('ammo_belt', tex='ammo_belt', rough=.4, metal=.7)
GREY = L.mat('hatch_grey', tex='hatch_grey', rough=.6, metal=.1)
GLASS = L.mat('plexiglas', color=(.62, .72, .78), rough=.05, metal=0, alpha=.12)
BOOT = L.mat('canvas_boot', color=(.26, .24, .17), rough=.9, metal=0)
ALU = L.mat('aluminium', color=(.55, .56, .55), rough=.35, metal=.85)
WIRE = L.mat('wiring_tan', color=(.42, .33, .17), rough=.7, metal=0)
RED = L.mat('extinguisher_red', color=(.45, .04, .03), rough=.4, metal=.2)
DARK = L.mat('bay_dark', color=(.01, .012, .01), rough=1, metal=0)
OD = L.mat('olive_drab', tex='olive_drab', rough=.72, metal=.1)

YF, YA = -6.7, -11.4          # forward (ball-turret side) and aft (toward the tail) ends
FLOOR_Z = -0.62
WY0, WY1, WZ0, WZ1 = -9.0, -7.7, 0.22, 1.24   # waist window opening


def lerp(a, b, t):
    return a + (b - a) * max(0.0, min(1.0, t))


def sec(y):
    t = (y - (-9.6)) / (YA - (-9.6))          # aft of the windows the fuselage tapers
    a = lerp(0.95, 0.78, t); top = lerp(1.78, 1.62, t); bot = lerp(-0.98, -0.55, t)
    return (a, (top - bot) / 2, (top + bot) / 2, 3.2, None)


def window(side):
    r = 0.16
    def hole(y, x, z):
        if x * side <= 0:
            return False
        u, v = y - (WY0 + WY1) / 2, z - (WZ0 + WZ1) / 2
        w, h = WY1 - WY0, WZ1 - WZ0
        if abs(u) > w / 2 or abs(v) > h / 2:
            return False
        du, dv = max(0, abs(u) - (w / 2 - r)), max(0, abs(v) - (h / 2 - r))
        return du * du + dv * dv <= r * r
    outline = L.rrect(WY1 - WY0, WZ1 - WZ0, r, 6)
    yc, zc = (WY0 + WY1) / 2, (WZ0 + WZ1) / 2
    L.window_frame([Vector((L.section_x(sec, yc + u, zc + v, side) - side * 0.01, yc + u, zc + v)) for (u, v) in outline], ZCF, 0.03)
    return hole


holes = [window(-1), window(1)]
L.shell(YA, YF, sec, ZC, holes=holes, name='skin', step=0.05)
# deep formers about every 0.45 m and light stringers, as in the photos
for y in [YF - 0.05 - 0.43 * i for i in range(11)]:
    L.ring_frame(y, sec, ZCF, depth=0.085, width=0.045, skip=lambda x, z, y=y: any(h(y, x, z) for h in holes))
for t in (0.0, 0.05, 0.95, 0.1, 0.9, 0.16, 0.84, 0.38, 0.62, 0.44, 0.56):
    L.stringer(YA, YF, sec, t, ZCF, size=(0.03, 0.025), steps=12)

# floor: raised walkway with corrugated aluminium and rubber mats, low step to the sides
L.box((0, (YF + YA) / 2, FLOOR_Z - 0.02), (1.3, abs(YF - YA), 0.04), FLOOR, bevel=0.004, tile=0.6)
for i in range(int(abs(YF - YA) / 0.05)):
    y = YF - 0.025 - i * 0.05
    L.box((0, y, FLOOR_Z + 0.004), (1.28, 0.012, 0.008), FLOOR, bevel=0)
L.box((0, -8.35, FLOOR_Z + 0.012), (0.95, 1.4, 0.012), MAT, bevel=0.003, tile=0.8)
L.box((0, -10.2, FLOOR_Z + 0.012), (0.8, 0.9, 0.012), MAT, bevel=0.003, tile=0.8)
L.box((0, -10.2, FLOOR_Z + 0.02), (0.9, 1.0, 0.004), ALU, bevel=0)     # floor (camera) hatch rim
# ledges under each window (sill shelves) and plywood kick panels below them
for s in (-1, 1):
    L.box((s * 0.82, (WY0 + WY1) / 2, WZ0 - 0.02), (0.22, WY1 - WY0 + 0.3, 0.035), ZCF, bevel=0.008)
    for k in range(9):
        L.box((s * 0.82, WY0 - 0.1 + k * 0.17, WZ0 + 0.0), (0.2, 0.015, 0.02), ZC, bevel=0.003)
    xw = L.section_x(sec, -8.35, -0.2, s) - s * 0.04
    L.panel((xw, -8.35, -0.2), 1.6, 0.66, WOOD, normal=(-s, 0, 0), up=(0, 0, 1))
# enclosed waist windows: framed Plexiglas with a booted gun port at the K-6 mount
PY, PZ, PW, PH = -8.2, 0.79, 0.20, 0.18
for s in (-1, 1):
    def wp(y, z, s=s):
        return (L.section_x(sec, y, z, s) - s * 0.018, y, z)
    y0, y1, z0, z1 = WY0 + 0.03, WY1 - 0.03, WZ0 + 0.03, WZ1 - 0.03
    for (ya, yb, za, zb) in [(y0, PY - PW / 2, z0, z1), (PY + PW / 2, y1, z0, z1),
                             (PY - PW / 2, PY + PW / 2, z0, PZ - PH / 2), (PY - PW / 2, PY + PW / 2, PZ + PH / 2, z1)]:
        bm = bmesh.new(); vs = [bm.verts.new(wp(*q)) for q in [(ya, za), (yb, za), (yb, zb), (ya, zb)]]; bm.faces.new(vs)
        L._obj(bm, GLASS, 'waist_glass', tile=0.5, smooth=0)
    # frame: horizontal rail at the port top, mullions either side of the port
    L.tube([wp(y0, PZ + PH / 2 + 0.01), wp(y1, PZ + PH / 2 + 0.01)], 0.016, ZCF, segs=8)
    for y in (PY - PW / 2 - 0.01, PY + PW / 2 + 0.01):
        L.tube([wp(y, z0), wp(y, z1)], 0.016, ZCF, segs=8)
    L.tube([wp(PY - PW / 2, PZ - PH / 2 - 0.01), wp(PY + PW / 2, PZ - PH / 2 - 0.01)], 0.016, ZCF, segs=8)
    # canvas boot round the barrel in the port
    c = Vector(wp(PY, PZ))
    L.box(c, (0.04, PW - 0.02, PH - 0.02), BOOT, bevel=0.03, segs=3)
    # latch handles (the window and mount jettison together)
    for y in (y0 + 0.05, y1 - 0.05):
        L.box(Vector(wp(y, z1 - 0.06)) - Vector((s * 0.02, 0, 0)), (0.03, 0.05, 0.03), BLACK, bevel=0.006)

# ------------------------------------------------------------- guns on pedestal mounts
for s in (-1, 1):
    px, py = s * 0.76, -8.2
    L.box((s * 0.84, py, WZ0 + 0.01), (0.16, 0.22, 0.04), PARK, bevel=0.008)  # K-6 base plate on the sill
    L.tube([(s * 0.80, py, WZ0 + 0.03), (px, py, 0.6)], 0.03, PARK, segs=12)  # K-6 post
    L.tube([(s * 0.86, py - 0.1, WZ0 + 0.03), (px, py, 0.45)], 0.016, PARK, segs=10)
    L.tube([(s * 0.86, py + 0.1, WZ0 + 0.03), (px, py, 0.45)], 0.016, PARK, segs=10)
    L.box((px, py, 0.64), (0.07, 0.07, 0.09), PARK, bevel=0.01)              # yoke / cradle
    gun_dir = Vector((s, 0, 0.06)).normalized()
    rec_c = Vector((px - s * 0.1, py, 0.77))
    L.box(rec_c, (0.6, 0.12, 0.17), PARK, bevel=0.012, rot=Euler((0, -s * 0.06, 0)))   # receiver
    L.box(rec_c + Vector((0, 0, 0.1)), (0.42, 0.11, 0.03), PARK, bevel=0.006)          # top cover
    L.cyl(rec_c + gun_dir * 0.3, rec_c + gun_dir * 1.25, 0.04, JACKET, segs=20)         # perforated jacket
    L.cyl(rec_c + gun_dir * 1.25, rec_c + gun_dir * 1.4, 0.022, PARK)
    for k in range(10):  # cooling holes suggested by dark rings
        p = rec_c + gun_dir * (0.38 + k * 0.085)
        L.cyl(p - gun_dir * 0.012, p + gun_dir * 0.012, 0.041, STEEL, cap=False, segs=20)
    grip = rec_c - gun_dir * 0.36
    for dy in (-0.07, 0.07):
        L.tube([grip + Vector((0, dy, 0.06)), grip + Vector((-s * 0.06, dy, 0.0)), grip + Vector((-s * 0.05, dy, -0.08))], 0.016, BLACK, segs=10)
    L.tube([grip + Vector((0, -0.07, 0.06)), grip + Vector((0, 0.07, 0.06))], 0.012, PARK, segs=8)
    L.cyl(rec_c + Vector((s * 0.05, 0, 0.1)), rec_c + Vector((s * 0.05, 0, 0.2)), 0.012, PARK)  # ring sight post
    L.lathe([(0.06, 0), (0.07, 0), (0.07, 0.008), (0.06, 0.008)], rec_c + Vector((s * 0.05, 0, 0.22)), (s, 0, 0), PARK, segs=24)
    # ammunition: box on the floor, belt rising to the feed tray
    L.box((s * 0.42, py + 0.45, FLOOR_Z + 0.2), (0.3, 0.35, 0.4), OD, bevel=0.02)
    belt = [Vector((s * 0.42, py + 0.45, FLOOR_Z + 0.42))] + L.bezier((s * 0.42, py + 0.45, FLOOR_Z + 0.5), (s * 0.42, py + 0.4, 0.4), (s * 0.56, py + 0.2, 0.78), (s * 0.62, py + 0.06, 0.8), 16)
    L.sweep(belt, [(-0.07, -0.012), (0.07, -0.012), (0.07, 0.012), (-0.07, 0.012)], AMMO, name='belt', smooth=30, up=(1, 0, 0))
    # oxygen bottle with regulator below the forward end of each window
    ox = Vector((s * 0.8, -7.55, -0.35))
    L.cyl(ox - Vector((0, 0, 0.22)), ox + Vector((0, 0, 0.22)), 0.095, OXY, bevel=0.03)
    L.sphere(ox + Vector((0, 0, 0.22)), 0.095, OXY, scale=(1, 1, .55))
    L.cyl(ox + Vector((0, 0, 0.0)), ox + Vector((0, 0, 0.02)), 0.099, BLACK, cap=False)
    L.box(ox + Vector((0, 0, 0.42)), (0.08, 0.1, 0.12), BLACK, bevel=0.015)
    L.tube(L.bezier(ox + Vector((-s * 0.04, 0, 0.42)), ox + Vector((-s * 0.25, -0.1, 0.4)), ox + Vector((-s * 0.3, -0.4, 0.1)), ox + Vector((-s * 0.25, -0.6, -0.1)), 12), 0.016, BLACK, segs=8)
    # wiring along the upper wall
    for k, z in enumerate((1.42, 1.47)):
        pts = [(L.section_x(sec, y, z, s) - s * (0.1 + 0.012 * k), y, z) for y in [YF - 0.1 - i * 0.35 for i in range(13)]]
        L.tube(pts, 0.008, WIRE, segs=6)

# forward: bulkhead opening toward the ball-turret well, with the deep step
fwd_open = lambda x, z: abs(x) < 0.38 and FLOOR_Z - 0.3 < z < 1.2
L.bulkhead(YF, sec, ZC, holes=[fwd_open], name='fwd_bulkhead', facing=-1)
L.box((0, YF + 0.5, 0.3), (0.76, 0.9, 1.8), DARK, bevel=0)
L.box((0, YF - 0.06, FLOOR_Z - 0.15), (0.76, 0.12, 0.3), ZCF, bevel=0.01)
L.box((-0.55, YF - 0.05, 0.6), (0.12, 0.08, 0.9), RED, bevel=0.03)       # extinguisher on the frame
L.box((0.6, YF - 0.06, 0.95), (0.3, 0.05, 0.22), OD, bevel=0.01)         # first-aid kit
# aft: tunnel toward the tail turret
aft_open = lambda x, z: abs(x) < 0.3 and FLOOR_Z < z < 1.0
L.bulkhead(YA, sec, ZC, holes=[aft_open], name='aft_bulkhead')
L.box((0, YA - 0.6, 0.2), (0.6, 1.1, 1.3), DARK, bevel=0)

# ------------------------------------------------------------- eyepoints (1.651 m standing eye above the floor)
EYE_Z = FLOOR_Z + 1.651
L.eye('eye_waistL', (-0.1, -8.2, EYE_Z), (-1.0, 0.0, -0.12))
L.eye('eye_waistR', (0.1, -8.2, EYE_Z), (1.0, 0.0, -0.12))
L.export(out)
print('wrote', out)
