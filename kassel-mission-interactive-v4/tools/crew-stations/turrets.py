"""B-24H/J gun turrets: Martin A-3 upper, Sperry A-13 ball, Consolidated A-6B tail.

Usage: python turrets.py -- out.glb top|ball|tail

Each turret is modelled in its own local frame (origin at the turret centre,
+Y = gun line, +Z up) and then placed in the shared crew-compartment frame
(Blender: X right, Y forward, Z up, metres; origin at the flight-deck floor
centre at the pilot's eye station).

What the references give (and what is estimated):
- Martin A-3C/D upper turret (B-24H/J): twin M2 .50s either side of the
  gunner's head, N-6 reflector sight (K-9 on the A-3D), two control handles
  with a trigger under each index finger, magazines below the gunner's feet,
  ammunition fed across (right gun from the left), 1/2 in armour plate on the
  sight bracket, interphone jack box on the right ejection chute, oxygen
  through a swivel in the base, two trouble lamps on the dome ribs, an escape
  hatch in the dome held by two quarter-turn handles. Dome and ring sizes,
  seat and handle positions are estimates.
- Sperry A-13 ball (B-24H/J): 44 in ball (the mission page's own A-13 figure),
  gunner curled on his back with head and back against the rear wall, feet on
  two footrests on the front wall either side of the round sighting window,
  guns either side of him at about eye level, K-4 computing sight hanging from
  the top between his feet, two hand grips with firing buttons, left foot
  ranging pedal, right foot interphone pedal, padded armour seat, ammunition
  cans inside fed by chutes. Exact component positions are estimates.
- Consolidated A-6B tail: hydraulic, twin M2 .50s with staggered mounts (the
  right gun set back 6 in), N-6 reflector sight, 2.2 in armour glass, 3/8 in
  plates beside the knees and armour below, ammunition boxes outside the
  turret feeding along rails (825 rounds per gun in the boxes, 250 on the
  rails), manual emergency hand cranks, dull dark green interior. Glazing
  outline, seat and control positions are estimates.
"""
import sys, math
import bpy  # noqa: F401
import bmesh
from mathutils import Vector, Matrix
import b24lib as L

args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else ['turret.glb', 'top']
out, which = args[0], args[1]
L.reset()

OD = L.mat('olive_drab', tex='olive_drab', rough=.72, metal=.1)
GRAY = L.mat('neutral_gray', color=(.32, .33, .33), rough=.7, metal=.1)
DKG = L.mat('dull_dark_green', color=(.075, .095, .06), rough=.8, metal=.12)
ZC = L.mat('zinc_chromate', tex='zinc_chromate', rough=.7, metal=.15)
ALU = L.mat('aluminium', color=(.55, .56, .55), rough=.35, metal=.85)
ALUD = L.mat('aluminium_dull', color=(.36, .37, .36), rough=.55, metal=.7)
STAIN = L.mat('stainless', color=(.62, .62, .6), rough=.25, metal=.9)
BLACK = L.mat('black_crinkle', tex='black_crinkle', rough=.6, metal=.25)
STEEL = L.mat('gunmetal', color=(.05, .05, .055), rough=.35, metal=.8)
PARK = L.mat('parkerized', color=(.11, .1, .09), rough=.55, metal=.6)
JACKET = L.mat('barrel_jacket', color=(.2, .17, .12), rough=.45, metal=.7)
ARMOR = L.mat('armour_plate', color=(.13, .14, .12), rough=.5, metal=.6)
AMMO = L.mat('ammo_belt', tex='ammo_belt', rough=.4, metal=.7)
PAD = L.mat('green_padding', color=(.2, .24, .13), rough=.8, metal=0)
LEATHER = L.mat('leather', color=(.22, .12, .06), rough=.65, metal=0)
GLASS = L.mat('plexiglas', color=(.62, .72, .78), rough=.05, metal=0, alpha=.1)
AGLASS = L.mat('armour_glass', color=(.55, .66, .6), rough=.02, metal=0, alpha=.22)
REFLECT = L.mat('reflector_glass', color=(.7, .8, .75), rough=.02, metal=.1, alpha=.3)
RETICLE = L.mat('reticle_lamp', color=(.9, .45, .15), rough=.4, metal=0, emit=(1.0, .45, .12), emit_strength=2.0)
RED = L.mat('button_red', color=(.5, .04, .03), rough=.4, metal=.1)
RUBBER = L.mat('rubber', color=(.03, .03, .03), rough=.85, metal=0)
OXY = L.mat('oxygen_yellow', tex='oxygen', rough=.45, metal=.2)
WIRE = L.mat('wiring_tan', color=(.42, .33, .17), rough=.7, metal=0)
HOSE = L.mat('hose_black', color=(.02, .02, .02), rough=.7, metal=0)
GAUGE = L.mat('gauge_faces', tex='gauges', rough=.3, metal=0)
LAMP = L.mat('lamp_amber', color=(.8, .55, .2), rough=.3, metal=0, emit=(.9, .6, .25), emit_strength=.6)


def mark():
    return len(L._OBJS)


def place(i0, origin, yaw=0.0):
    """Move the objects made since i0 from the turret's local frame into place."""
    M = Matrix.Translation(Vector(origin)) @ Matrix.Rotation(yaw, 4, 'Z')
    for ob in L._OBJS[i0:]:
        ob.data.transform(M)
    return M


def world(M, p):
    return tuple(M @ Vector(p))


def wdir(M, d):
    return tuple(M.to_3x3() @ Vector(d))


def sphere_shell(r, m, keep, segs=96, rings=48, name='sphere_shell'):
    """UV sphere about the origin keeping only faces whose centre passes keep(p)."""
    bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=segs, v_segments=rings, radius=r)
    gone = [f for f in bm.faces if not keep(f.calc_center_median())]
    bmesh.ops.delete(bm, geom=gone, context='FACES')
    return L._obj(bm, m, name, tile=0.4, smooth=80)


def quad(pts, m, name='quad', thick=0.0):
    bm = bmesh.new(); vs = [bm.verts.new(p) for p in pts]; bm.faces.new(vs)
    if thick:
        bmesh.ops.solidify(bm, geom=list(bm.faces), thickness=thick)
    return L._obj(bm, m, name, tile=0.4, smooth=0)


def m2_gun(p, d, m_recv=PARK, barrel_len=0.95, jacket=True):
    """Browning M2 aircraft .50: receiver, back plate and spade grips removed for
    turret use, solenoid, feed cover, perforated barrel jacket, muzzle."""
    p, d = Vector(p), Vector(d).normalized()
    up = Vector((0, 0, 1)); side = d.cross(up).normalized(); up = side.cross(d)
    R = Matrix((side, d, up)).transposed().to_4x4()
    L.box(tuple(p + d * 0.0), (0.105, 0.62, 0.15), m_recv, bevel=0.008, rot=R)                 # receiver
    L.box(tuple(p + d * 0.05 + up * 0.085), (0.1, 0.34, 0.02), STEEL, bevel=0.004, rot=R)        # feed cover
    L.box(tuple(p - d * 0.31), (0.09, 0.03, 0.12), STEEL, bevel=0.006, rot=R)                    # back plate
    L.cyl(tuple(p - d * 0.2 - up * 0.1), tuple(p - d * 0.2 - up * 0.04), 0.022, STEEL)          # solenoid
    L.box(tuple(p + d * 0.06 + side * 0.06), (0.012, 0.2, 0.09), STEEL, bevel=0.003, rot=R)      # feed tray side
    b0 = p + d * 0.31
    if jacket:
        L.cyl(tuple(b0), tuple(b0 + d * barrel_len), 0.033, JACKET, segs=18)
        for k in range(10):                                                                       # cooling holes
            c = b0 + d * (0.06 + k * barrel_len * 0.09)
            for s in (-1, 1):
                L.cyl(tuple(c + side * s * 0.031), tuple(c + side * s * 0.036), 0.009, STEEL, segs=8, cap=True)
    L.cyl(tuple(b0 + d * barrel_len), tuple(b0 + d * (barrel_len + 0.18)), 0.016, STEEL, segs=14)
    L.cyl(tuple(b0 + d * (barrel_len + 0.18)), tuple(b0 + d * (barrel_len + 0.24)), 0.024, STEEL, segs=14)


def reflector_sight(base, look, scale=1.0, n6=True):
    """N-6/N-8 style reflector sight: lamp housing, collimator body, tilted
    reflector glass over the lens, reticle glow on the glass."""
    base, f = Vector(base), Vector(look).normalized()
    up = Vector((0, 0, 1)); side = f.cross(up).normalized(); up = side.cross(f)
    R = Matrix((side, f, up)).transposed().to_4x4()
    s = scale
    L.box(tuple(base), (0.075 * s, 0.16 * s, 0.07 * s), BLACK, bevel=0.008, rot=R)                 # body
    L.cyl(tuple(base - f * 0.08 * s), tuple(base - f * 0.13 * s), 0.024 * s, BLACK)                # lamp housing
    L.cyl(tuple(base + up * 0.035 * s), tuple(base + up * 0.05 * s), 0.028 * s, STEEL)             # lens ring
    g = base + up * 0.085 * s + f * 0.012 * s
    tilt = Matrix.Rotation(math.radians(-38), 4, side)
    L.box(tuple(g), (0.075 * s, 0.004, 0.07 * s), REFLECT, bevel=0, rot=tilt @ R)                  # reflector glass
    L.cyl(tuple(g - f * 0.003), tuple(g - f * 0.001), 0.007 * s, RETICLE, segs=12)                 # reticle pip
    L.box(tuple(base + up * 0.13 * s + f * 0.02 * s), (0.08 * s, 0.07 * s, 0.005), BLACK, bevel=0, rot=R)  # sun shade over the glass
    L.cyl(tuple(base + side * 0.045 * s), tuple(base + side * 0.06 * s), 0.012 * s, STEEL)         # dimmer knob


def grip(p, axis, m=BLACK, button=True):
    p, a = Vector(p), Vector(axis).normalized()
    L.cyl(tuple(p), tuple(p + a * 0.12), 0.019, m, segs=14, bevel=0.006)
    for k in range(4):                                                                                 # finger ridges
        L.cyl(tuple(p + a * (0.02 + k * 0.025)), tuple(p + a * (0.028 + k * 0.025)), 0.0205, RUBBER, segs=14)
    if button:
        L.cyl(tuple(p + a * 0.12), tuple(p + a * 0.132), 0.01, RED, segs=10)


def chute(points, w, h, m):
    """Flexible ammunition chute: articulated links along a path."""
    pts = [Vector(x) for x in points]
    for i in range(len(pts) - 1):
        a, b = pts[i], pts[i + 1]; d = (b - a)
        n = max(1, int(d.length / 0.045))
        for k in range(n):
            c = a + d * ((k + 0.5) / n)
            R = Vector((0, 1, 0)).rotation_difference(d.normalized()).to_matrix().to_4x4()
            L.box(tuple(c), (w, d.length / n * 0.92, h), m, bevel=0.004, rot=R)


def bolts_ring(c, r, n, axis, m=STEEL, br=0.008):
    c, a = Vector(c), Vector(axis).normalized()
    u = a.orthogonal().normalized(); v = a.cross(u)
    for k in range(n):
        t = 2 * math.pi * k / n
        L.sphere(tuple(c + (u * math.cos(t) + v * math.sin(t)) * r), br, m, segs=8, rings=4)


def fuselage_top(y0, y1, prof0, prof1, m, hole=None, name='fuselage_top', step=0.08, k=40):
    """Outer upper skin between two (half-width, top, side-bottom) profiles.
    Sections are super-ellipses so it joins the flight-deck model's skin."""
    bm = bmesh.new(); rows = []
    n = max(2, int(abs(y1 - y0) / step))
    for i in range(n + 1):
        t = i / n; y = y0 + (y1 - y0) * t
        a = prof0[0] + (prof1[0] - prof0[0]) * t; top = prof0[1] + (prof1[1] - prof0[1]) * t
        low = prof0[2] + (prof1[2] - prof0[2]) * t
        b = (top - low) / 1.0; row = []
        for j in range(k + 1):
            th = -math.pi / 2 + math.pi * j / k                       # -90..90 deg over the top
            s, c = math.sin(th), math.cos(th)
            x = a * math.copysign(abs(s) ** (2 / 3.2), s)
            z = low + b * abs(c) ** (2 / 3.2)
            row.append(bm.verts.new((x, y, z)))
        rows.append(row)
    for i in range(n):
        for j in range(k):
            vs = (rows[i][j], rows[i][j + 1], rows[i + 1][j + 1], rows[i + 1][j])
            if hole is not None:
                cen = sum((v.co for v in vs), Vector()) / 4
                if hole(cen):
                    continue
            bm.faces.new(vs)
    return L._obj(bm, m, name, tile=0.9, smooth=50)


# ======================================================================= top
def build_top():
    """Martin A-3 after JP's cutaway (T-71, July '44): low frameless bubble on a
    wide flange with a toothed azimuth ring gear beneath; a rounded armoured
    housing between the guns with the sight on it; cylindrical tub hanging into
    the deck with ammunition boxes, motor and cabling; stirrup footrest below."""
    TY, ZR = -2.15, 1.70                   # turret ring centre on the aft-deck roof line
    RF = 0.66                              # flange radius
    fuselage_top(-1.4, -2.9, (0.995, 1.719, 1.0), (0.995, 1.719, 1.0), OD,
                 hole=lambda c: c.x * c.x + (c.y - TY) ** 2 < (RF - 0.04) ** 2 or abs(c.x) > 0.72, name='turret_skin')
    fuselage_top(-7.42, -11.4, (0.995, 1.719, 0.75), (0.80, 1.62, 0.55), OD, name='aft_fuselage_top')
    fuselage_top(-11.4, -14.2, (0.80, 1.62, 0.55), (0.52, 1.24, 0.25), OD, name='tail_fuselage_top')
    i0 = mark()
    # ---- flange, ring gear and race (local frame: origin on the ring centre at roof height)
    L.lathe([(0.55, 0.0), (RF, 0.0), (RF, 0.022), (0.55, 0.03)], (0, 0, 0), (0, 0, 1), ALUD, segs=96, name='flange')
    bolts_ring((0, 0, 0.024), RF - 0.03, 60, (0, 0, 1), STEEL, br=0.006)
    L.lathe([(0.585, -0.075), (0.605, -0.075), (0.605, -0.005), (0.585, -0.005)], (0, 0, 0), (0, 0, 1), STEEL, segs=96, name='gear_web')
    for k in range(150):                                                              # azimuth ring gear teeth
        t = 2 * math.pi * k / 150
        L.box((math.cos(t) * 0.613, math.sin(t) * 0.613, -0.04), (0.018, 0.011, 0.05), STEEL, bevel=0, rot=Matrix.Rotation(t, 4, 'Z'))
    L.lathe([(0.56, 0.03), (0.585, 0.03), (0.585, 0.075), (0.56, 0.08)], (0, 0, 0), (0, 0, 1), ALU, segs=96, name='dome_ring')
    # ---- dome: one-piece moulded plastic, no framing
    prof = [(0.585, 0.075), (0.585, 0.15), (0.57, 0.25), (0.53, 0.34), (0.46, 0.415), (0.36, 0.465), (0.22, 0.495), (0.08, 0.507), (0.0, 0.508)]
    L.lathe(prof, (0, 0, 0), (0, 0, 1), GLASS, segs=96, name='dome')
    # ---- rounded armoured housing between the guns, sight on top, guard arch
    H = (0, 0.17, 0.13)
    L.box(H, (0.34, 0.34, 0.22), ARMOR, bevel=0.1, segs=5, name='head_housing')
    L.box((0, 0.17, 0.035), (0.40, 0.42, 0.05), ARMOR, bevel=0.015)
    for k in range(4):                                                                 # small holes in the housing face
        L.cyl((-0.02 + (k % 2) * 0.04, 0.0, 0.17 + (k // 2) * 0.04), (-0.02 + (k % 2) * 0.04, -0.004, 0.17 + (k // 2) * 0.04), 0.006, RUBBER, segs=8)
    reflector_sight((0, 0.10, 0.26), (0, 1, 0), scale=1.0)
    arch = [(math.cos(t) * 0.19, 0.30, 0.30 + math.sin(t) * 0.12) for t in [math.pi * i / 24 for i in range(25)]]
    L.tube(arch, 0.014, ALUD, segs=8)                                                  # sight guard arch
    # ---- guns on the sides of the housing; barrels through ports in the dome
    GX, GZ = 0.215, 0.135
    for s in (-1, 1):
        m2_gun((s * GX, 0.16, GZ), (0, 1, 0), barrel_len=0.95)
        port_y = math.sqrt(max(0.0, 0.585 ** 2 - GX ** 2)) - 0.01
        L.cyl((s * GX, port_y - 0.02, GZ), (s * GX, port_y + 0.03, GZ), 0.045, RUBBER)  # dome port boot
        L.box((s * (GX + 0.07), 0.16, GZ - 0.01), (0.012, 0.5, 0.16), ALUD, bevel=0.004)
        L.box((s * GX, 0.02, GZ - 0.15), (0.08, 0.06, 0.16), ALUD, bevel=0.008)        # ejection chute
        L.box((s * (GX + 0.05), -0.08, GZ + 0.02), (0.03, 0.08, 0.03), BLACK, bevel=0.004)   # charger handle
    L.box((0.27, -0.03, GZ - 0.14), (0.06, 0.05, 0.08), BLACK, bevel=0.006)             # interphone jack box on the right chute
    # ---- control handles below the housing; trigger under each index finger
    L.box((0, 0.10, -0.09), (0.16, 0.12, 0.1), BLACK, bevel=0.012)
    for s in (-1, 1):
        L.cyl((s * 0.07, 0.10, -0.09), (s * 0.13, 0.06, -0.10), 0.018, STEEL)
        grip((s * 0.14, 0.05, -0.15), (0, -0.25, 1.0))
        L.box((s * 0.14, 0.03, -0.08), (0.015, 0.03, 0.035), RED, bevel=0.003)
    # saddle seat on its support bars (height set by pins) and the padded back rest
    L.box((0, -0.16, -0.40), (0.26, 0.22, 0.05), LEATHER, bevel=0.02, name='seat')
    L.box((0, -0.16, -0.44), (0.2, 0.16, 0.03), ALUD, bevel=0.008)
    for sx in (-1, 1):
        L.cyl((sx * 0.07, -0.20, -0.95), (sx * 0.07, -0.20, -0.45), 0.016, ALU)
        for k in range(6):
            L.cyl((sx * 0.054, -0.20, -0.85 + k * 0.05), (sx * 0.086, -0.20, -0.85 + k * 0.05), 0.006, STEEL, segs=8)
    L.cyl((0.09, -0.20, -0.62), (0.13, -0.20, -0.62), 0.018, RED)
    # padded back rest at the rear of the turret
    L.box((0, -0.40, 0.05), (0.34, 0.08, 0.26), PAD, bevel=0.03)
    L.box((0, -0.44, 0.05), (0.38, 0.03, 0.30), ALUD, bevel=0.01)
    # ---- tub hanging below the ring: skin, ammunition boxes, motor, cabling
    L.lathe([(0.55, -0.08), (0.55, -0.95)], (0, 0, 0), (0, 0, 1), ALUD, segs=64, name='tub', arc=(math.radians(110), math.radians(430)))
    for z in (-0.1, -0.5, -0.93):
        L.tube([(math.cos(t) * 0.555, math.sin(t) * 0.555, z) for t in [2 * math.pi * i / 64 for i in range(65)]], 0.012, ALU, segs=6)
    for s, w in ((1, 0.30), (-1, 0.24)):                                                # ammunition boxes on the tub
        L.box((s * 0.36, 0.18, -0.55), (0.16, w, 0.62), OD, bevel=0.012)
        L.box((s * 0.36, 0.18, -0.235), (0.165, w + 0.005, 0.012), ALU, bevel=0.003)
        L.panel((s * 0.36, 0.18, -0.228), 0.14, w - 0.04, AMMO, normal=(0, 0, 1), up=(0, 1, 0))
        chute([(s * 0.34, 0.20, -0.24), (s * 0.30, 0.22, -0.05), (-s * 0.06, 0.24, 0.03), (-s * (GX + 0.05), 0.20, GZ + 0.03)], 0.06, 0.03, ALUD)
    L.cyl((-0.30, -0.25, -0.45), (-0.30, -0.25, -0.80), 0.085, BLACK, bevel=0.01)       # drive motor
    L.box((-0.30, -0.25, -0.40), (0.2, 0.2, 0.08), ALUD, bevel=0.01)
    L.box((-0.38, -0.05, -0.30), (0.1, 0.16, 0.12), BLACK, bevel=0.01)                  # junction box
    for k, (a, b) in enumerate([((-0.30, -0.18, -0.45), (-0.38, -0.05, -0.30)), ((-0.24, -0.30, -0.6), (-0.10, -0.45, -0.1)),
                                ((-0.38, -0.05, -0.36), (-0.2, 0.05, -0.08)), ((-0.4, -0.12, -0.3), (-0.45, -0.3, -0.85))]):
        L.tube(L.bezier(a, (a[0] - 0.08, a[1], a[2] - 0.1), (b[0] - 0.05, b[1], b[2] - 0.05), b, 10), 0.008, HOSE if k % 2 else WIRE)
    L.box((0.33, -0.25, -0.35), (0.14, 0.12, 0.2), BLACK, bevel=0.012)                  # hydraulic unit and gauges
    L.panel((0.33, -0.31, -0.32), 0.10, 0.05, GAUGE, normal=(0, -1, 0), up=(0, 0, 1))
    # stirrup footrest
    L.tube([(-0.22, -0.05, -0.95), (-0.22, -0.02, -1.22), (0.22, -0.02, -1.22), (0.22, -0.05, -0.95)], 0.016, STEEL, segs=10)
    L.tube([(-0.2, -0.02, -1.22), (-0.2, 0.18, -1.22)], 0.014, STEEL); L.tube([(0.2, -0.02, -1.22), (0.2, 0.18, -1.22)], 0.014, STEEL)
    # oxygen through the swivel in the base; regulator; heated-suit outlet
    L.cyl((0, -0.30, -0.95), (0, -0.30, -1.02), 0.045, ALU)
    L.tube([(0, -0.30, -0.95), (-0.12, -0.36, -0.6), (-0.15, -0.38, -0.2), (-0.1, -0.3, 0.0)], 0.012, HOSE)
    L.box((0.12, -0.40, -0.25), (0.1, 0.05, 0.12), BLACK, bevel=0.01)
    L.cyl((0.12, -0.375, -0.23), (0.12, -0.37, -0.23), 0.025, GAUGE)
    M = place(i0, (0, TY, ZR))
    eye = (0, -0.14, 0.345)
    L.eye('eye_ttop', world(M, eye), wdir(M, (0, 1, 0.0)))


# ======================================================================= ball
def build_ball():
    """Sperry A-13 after JP's references: unpainted aluminium ball with riveted
    frames, a round sighting window between the guns, lattice windows down the
    sides, a spoked entry door, a heavy mounting flange with gearbox and hand
    crank on top, the gunner curled on his back with ammunition boxes above."""
    C = (0, -5.92, -1.45)                  # lowered: about 0.4 m of the ball below the belly
    r = 44 * 0.0254 / 2
    i0 = mark()
    # Neutral-gray belly around the well (the aircraft model is cut away here).
    bm = bmesh.new(); rows = []
    for i in range(31):
        y = -1.5 + i * 0.1; row = []
        for j in range(25):
            x = -1.0 + j * 2.0 / 24
            row.append(bm.verts.new((x, y, 0.62 + 0.18 * (x / 1.0) ** 4)))
        rows.append(row)
    for i in range(30):
        for j in range(24):
            vs = (rows[i][j], rows[i][j + 1], rows[i + 1][j + 1], rows[i + 1][j])
            c = sum((v.co for v in vs), Vector()) / 4
            if c.x * c.x + c.y * c.y < 0.70 ** 2:
                continue
            bm.faces.new(vs)
    L._obj(bm, GRAY, 'belly', tile=0.9, smooth=40)

    sight_cos = 0.925
    door_axis = Vector((-0.55, -0.83, 0.05)).normalized()           # spoked entry door, aft left
    door_cos = 0.90

    def lonlat(p):
        return math.atan2(p.x, p.y), math.asin(max(-1, min(1, p.z)))

    def region(p):
        p = Vector(p).normalized()
        if p.y > sight_cos:
            return 'front'
        if p.dot(door_axis) > door_cos:
            return 'door'
        lon, lat = lonlat(p)
        if 0.62 < abs(lon) < 1.75 and -0.95 < lat < 0.12:
            return 'lattice'
        if p.z > math.sin(0.62):
            return 'cap'
        return None

    def slot(p):
        return p.y > 0 and abs(abs(p.x) - 0.38) < 0.035 and abs(p.z) < 0.045

    open_ = lambda p: region(p) in ('front', 'lattice', 'door') or slot(p)
    sphere_shell(r, ALU, lambda p: not open_(p), name='ball_outer')
    sphere_shell(r - 0.014, ALUD, lambda p: not open_(p), name='ball_inner')
    sphere_shell(r - 0.004, GLASS, lambda p: region(p) in ('lattice', 'door'), name='lattice_glass')
    sphere_shell(r - 0.006, AGLASS, lambda p: region(p) == 'front', segs=128, rings=64, name='sight_window')

    def on_sphere(lon, lat, rr=r - 0.006):
        return (rr * math.cos(lat) * math.sin(lon), rr * math.cos(lat) * math.cos(lon), rr * math.sin(lat))

    # lattice frames: meridians and parallels across the side window bands
    for s in (-1, 1):
        for lon in (0.62, 0.9, 1.18, 1.46, 1.75):
            L.tube([on_sphere(s * lon, -0.95 + j * 1.07 / 18) for j in range(19)], 0.016, ALU, segs=6)
        for lat in (-0.95, -0.55, -0.2, 0.12):
            L.tube([on_sphere(s * (0.62 + j * 1.13 / 20), lat) for j in range(21)], 0.016, ALU, segs=6)
    # riveted frames: two bands about the trunnion axis and a parallel at the flange
    for ang in (math.radians(-38), math.radians(38)):
        pts = []
        for j in range(97):
            t = 2 * math.pi * j / 96
            p = Matrix.Rotation(ang, 3, 'Z') @ (Vector((0, math.cos(t), math.sin(t))) * (r + 0.004))
            pts.append(tuple(p))
        L.tube(pts, 0.013, ALU, segs=6)
        for j in range(0, 96, 3):
            t = 2 * math.pi * j / 96
            p = Matrix.Rotation(ang, 3, 'Z') @ (Vector((0, math.cos(t), math.sin(t))) * (r + 0.016))
            L.sphere(tuple(p), 0.0045, ALUD, segs=6, rings=3)
    # sight window rim and bolts
    sr = r * math.sqrt(1 - sight_cos ** 2)
    L.lathe([(sr - 0.002, 0), (sr + 0.04, 0), (sr + 0.04, 0.03), (sr - 0.002, 0.03)], (0, r * sight_cos - 0.035, 0), (0, 1, 0), ALU, segs=64, name='sight_rim')
    bolts_ring((0, r * sight_cos - 0.04, 0), sr + 0.022, 16, (0, 1, 0), STEEL)
    # spoked entry door
    dc = door_axis * r * door_cos; dr = r * math.sqrt(1 - door_cos ** 2)
    L.lathe([(dr - 0.01, 0), (dr + 0.03, 0), (dr + 0.03, 0.025), (dr - 0.01, 0.025)], tuple(dc - door_axis * 0.012), tuple(door_axis), ALU, segs=48)
    u = door_axis.orthogonal().normalized(); v = door_axis.cross(u)
    for k in range(8):
        t = 2 * math.pi * k / 8
        a = dc + (u * math.cos(t) + v * math.sin(t)) * 0.03; b = dc + (u * math.cos(t) + v * math.sin(t)) * dr
        L.tube([tuple(a), tuple(b)], 0.012, ALU, segs=6)
    L.cyl(tuple(dc - door_axis * 0.01), tuple(dc + door_axis * 0.02), 0.045, ALU)
    # trunnion hubs and the yoke up to the mounting flange
    for s in (-1, 1):
        L.cyl((s * (r - 0.02), 0, 0), (s * (r + 0.05), 0, 0), 0.15, ALU, segs=40, bevel=0.01)
        L.cyl((s * (r + 0.05), 0, 0), (s * (r + 0.1), 0, 0), 0.065, ALUD, segs=24)
        L.cyl((s * (r - 0.12), 0, 0), (s * (r - 0.02), 0, 0), 0.11, ALUD, segs=32)
        for dy in (-0.12, 0.12):
            L.box((s * (r + 0.09), dy, 0.2), (0.05, 0.06, 0.42), ALUD, bevel=0.01)
    FZ = 0.40
    L.lathe([(0.0, FZ), (0.68, FZ), (0.68, FZ + 0.07), (0.0, FZ + 0.07)], (0, 0, 0), (0, 0, 1), ALUD, segs=96, name='mount_flange')
    for k in range(18):
        t = 2 * math.pi * k / 18
        L.cyl((math.cos(t) * 0.63, math.sin(t) * 0.63, FZ - 0.02), (math.cos(t) * 0.63, math.sin(t) * 0.63, FZ - 0.05), 0.025, STEEL, segs=12)
    L.box((0.32, -0.28, FZ + 0.14), (0.22, 0.16, 0.16), ALUD, bevel=0.02)                 # azimuth gearbox
    L.cyl((0.42, -0.30, FZ + 0.22), (0.42, -0.30, FZ + 0.38), 0.025, STEEL)               # hand crank
    L.tube([(0.42, -0.30, FZ + 0.38), (0.52, -0.30, FZ + 0.38)], 0.012, STEEL)
    L.cyl((0.52, -0.30, FZ + 0.38), (0.52, -0.30, FZ + 0.44), 0.014, BLACK)
    # ---- inside: guns either side of the gunner at about eye level
    GX = 0.38
    for s in (-1, 1):
        m2_gun((s * GX, -0.05, 0.0), (0, 1, 0), barrel_len=0.95)
        for dz in (-0.055, 0.055):
            L.box((s * GX, math.sqrt(r * r - GX * GX) - 0.005, dz), (0.07, 0.05, 0.02), RUBBER, bevel=0.006)
        L.box((s * (GX - 0.08), -0.05, -0.02), (0.012, 0.55, 0.16), ALUD, bevel=0.004)
        L.box((s * GX, 0.0, -0.17), (0.07, 0.07, 0.18), ALUD, bevel=0.008)                # case chute
        L.box((s * (GX - 0.06), -0.25, 0.05), (0.03, 0.08, 0.03), BLACK, bevel=0.004)      # charger handle
        # tall ammunition boxes above, feeding down to the guns
        L.box((s * 0.20, -0.08, 0.30), (0.13, 0.30, 0.20), STAIN, bevel=0.01)
        L.box((s * 0.20, -0.08, 0.403), (0.135, 0.305, 0.008), STEEL, bevel=0.002)
        chute([(s * 0.26, 0.0, 0.22), (s * 0.34, 0.03, 0.13), (s * GX, 0.03, 0.09)], 0.065, 0.028, ALUD)
    # K-4 computing sight hanging from the top, between the gunner's feet
    L.box((0, 0.10, 0.40), (0.1, 0.12, 0.08), BLACK, bevel=0.01)
    L.cyl((0, 0.10, 0.37), (0, 0.10, 0.27), 0.022, STEEL)
    L.cyl((0, 0.08, 0.14), (0, 0.07, 0.03), 0.016, STEEL)
    L.box((0, 0.12, 0.20), (0.15, 0.2, 0.14), BLACK, bevel=0.012, name='k4_computer')
    L.box((-0.09, 0.12, 0.21), (0.03, 0.12, 0.09), BLACK, bevel=0.008)
    L.cyl((-0.11, 0.12, 0.21), (-0.125, 0.12, 0.21), 0.035, ALUD, segs=20)
    reflector_sight((0, 0.06, 0.0), (0, 1, -0.12), scale=0.9)
    for s in (-1, 1):
        L.cyl((s * 0.075, 0.08, 0.15), (s * 0.15, 0.03, 0.12), 0.014, STEEL)
        grip((s * 0.15, 0.03, 0.12), (s * 0.15, -0.6, -0.8))
    # footrests on the front wall either side of the window; pedals
    for s in (-1, 1):
        p = Vector((s * 0.27, 0.40, -0.20))
        L.box(tuple(p), (0.11, 0.025, 0.2), ALUD, bevel=0.008, rot=Matrix.Rotation(-s * 0.45, 4, 'Z') @ Matrix.Rotation(-0.5, 4, 'X'))
        L.box(tuple(p + Vector((0, -0.03, -0.1))), (0.11, 0.06, 0.02), RUBBER, bevel=0.006)
    L.box((-0.17, 0.35, -0.33), (0.07, 0.11, 0.025), BLACK, bevel=0.006, rot=Matrix.Rotation(-0.6, 4, 'X'))   # ranging pedal (left foot)
    L.box((0.17, 0.35, -0.33), (0.05, 0.07, 0.025), RED, bevel=0.006, rot=Matrix.Rotation(-0.6, 4, 'X'))     # interphone pedal (right foot)
    # padded armour seat back and headrest against the rear wall
    L.box((0, -0.43, -0.12), (0.36, 0.035, 0.42), ARMOR, bevel=0.01, rot=Matrix.Rotation(-0.35, 4, 'X'))
    L.box((0, -0.40, -0.12), (0.30, 0.04, 0.36), PAD, bevel=0.018, rot=Matrix.Rotation(-0.35, 4, 'X'))
    L.box((0, -0.40, 0.17), (0.2, 0.06, 0.12), PAD, bevel=0.025, rot=Matrix.Rotation(0.3, 4, 'X'))
    L.box((0, -0.36, -0.38), (0.3, 0.2, 0.04), PAD, bevel=0.015, rot=Matrix.Rotation(-0.9, 4, 'X'))
    L.tube([(0.04, -0.15, 0.5), (0.08, -0.25, 0.3), (0.12, -0.33, 0.1)], 0.012, HOSE)
    L.tube([(-0.04, -0.15, 0.5), (-0.1, -0.28, 0.25), (-0.13, -0.3, 0.05)], 0.006, WIRE)
    M = place(i0, C)
    eye = Vector((0, -0.24, 0.13)); target = Vector((0, r * sight_cos, -0.02))
    L.eye('eye_ball', world(M, eye), wdir(M, target - eye))


# ======================================================================= tail
def build_tail():
    """Consolidated A-6B after JP's labelled diagram and interior photo: flat
    bulletproof glass in front of the gunner with the sight on its cradle,
    rounded gun shields either side with the guns low beside him, ammunition
    guides curving in under the window, armour plate below, clear dome over
    his head, mounting ring with the azimuth ring gear, tub underneath."""
    C = (0, -14.72, 0.10)                  # turret axis at the mounting ring; the turret faces aft
    i0 = mark()
    Y0 = 0.36                              # front face (aft-facing)
    # ---- mounting ring, azimuth ring gear and tub
    L.lathe([(0.40, 0.0), (0.52, 0.0), (0.52, 0.04), (0.40, 0.04)], (0, 0, 0), (0, 0, 1), ALUD, segs=72, name='mount_ring')
    for k in range(120):
        t = 2 * math.pi * k / 120
        L.box((math.cos(t) * 0.535, math.sin(t) * 0.535, -0.02), (0.016, 0.012, 0.035), STEEL, bevel=0, rot=Matrix.Rotation(t, 4, 'Z'))
    L.box((0, 0.0, -0.18), (0.62, 0.62, 0.28), OD, bevel=0.08, segs=4, name='tub')
    L.box((0, 0.0, -0.05), (0.6, 0.6, 0.02), STEEL, bevel=0)                               # floor tread plate
    # ---- body: armour plate below the window, sides, gun shields
    quad([(-0.28, Y0 + 0.02, 0.04), (0.28, Y0 + 0.02, 0.04), (0.28, Y0, 0.50), (-0.28, Y0, 0.50)], ARMOR, name='armour_plate', thick=0.021)
    quad([(-0.28, Y0 + 0.04, 0.04), (0.28, Y0 + 0.04, 0.04), (0.28, Y0 + 0.022, 0.50), (-0.28, Y0 + 0.022, 0.50)], OD, name='armour_plate_out')
    for s in (-1, 1):
        L.box((s * 0.30, 0.0, 0.62), (0.03, 0.74, 1.15), DKG, bevel=0.01)                 # inner side walls
        L.box((s * 0.43, 0.05, 0.42), (0.24, 0.62, 0.62), OD, bevel=0.1, segs=5, name='gun_shield')
        L.box((s * 0.43, 0.05, 0.42), (0.22, 0.60, 0.60), DKG, bevel=0.09, segs=5)
    # ---- flat bulletproof glass, its frame, and the clear dome over the head
    ag = [(-0.25, Y0, 0.50), (0.25, Y0, 0.50), (0.25, Y0, 0.98), (-0.25, Y0, 0.98)]
    quad(ag, AGLASS, name='bulletproof_glass', thick=0.056)
    L.tube([(-0.26, Y0 - 0.01, 0.49), (0.26, Y0 - 0.01, 0.49), (0.26, Y0 - 0.01, 0.99), (-0.26, Y0 - 0.01, 0.99), (-0.26, Y0 - 0.01, 0.49)], 0.02, ARMOR, segs=6)
    for k in range(9):                                                                        # frame rivets
        for z in (0.49, 0.99):
            L.sphere((-0.24 + k * 0.06, Y0 - 0.032, z), 0.006, STEEL, segs=6, rings=3)
    for s in (-1, 1):                                                                         # side glazing above the shields
        quad([(s * 0.31, Y0, 0.72), (s * 0.31, -0.30, 0.72), (s * 0.31, -0.30, 1.0), (s * 0.31, Y0, 1.0)], GLASS, name='side_glass')
    dome = []
    for i in range(13):
        y = Y0 - i * (0.70 / 12)
        dome.append([(0.33 * math.cos(math.pi * j / 16) * 1.0, y, 0.98 + 0.16 * math.sin(math.pi * j / 16)) for j in range(17)])
    bm = bmesh.new(); vv = [[bm.verts.new(p) for p in row] for row in dome]
    for i in range(12):
        for j in range(16):
            bm.faces.new((vv[i][j], vv[i][j + 1], vv[i + 1][j + 1], vv[i + 1][j]))
    L._obj(bm, GLASS, 'dome', tile=0.5, smooth=60)
    L.tube([(0.33 * math.cos(math.pi * j / 16), Y0, 0.98 + 0.16 * math.sin(math.pi * j / 16)) for j in range(17)], 0.016, ARMOR, segs=6)
    L.tube([(0.33 * math.cos(math.pi * j / 16), Y0 - 0.70, 0.98 + 0.16 * math.sin(math.pi * j / 16)) for j in range(17)], 0.016, OD, segs=6)
    # rear: armoured sliding doors behind the gunner
    for s in (-1, 1):
        L.box((s * 0.14, -0.36, 0.55), (0.27, 0.03, 1.0), DKG, bevel=0.008)
        L.box((s * 0.04, -0.34, 0.65), (0.02, 0.03, 0.14), ALU, bevel=0.005)
    L.box((0, -0.36, 1.07), (0.6, 0.04, 0.05), ALUD, bevel=0.006)
    # ---- guns low either side of the gunner, through the shields
    GZ = 0.42
    for s, back in ((1, 0.0), (-1, 0.152)):                                                   # right gun set back 6 in
        x = s * 0.40
        m2_gun((x, 0.02 - back, GZ), (0, 1, 0), barrel_len=0.9)
        L.cyl((x, 0.33, GZ), (x, 0.38, GZ), 0.065, RUBBER, segs=24)                         # shield port
        L.box((x - s * 0.07, 0.0 - back, GZ - 0.02), (0.012, 0.52, 0.18), ALUD, bevel=0.004)
        L.cyl((x - s * 0.09, 0.10 - back, GZ), (x + s * 0.09, 0.10 - back, GZ), 0.024, STEEL)
        L.box((x - s * 0.07, -0.22 - back, GZ + 0.07), (0.05, 0.08, 0.03), BLACK, bevel=0.004)   # charger handle
        # ammunition guide curving in under the window from the rails in the fuselage
        pts = [(s * 0.22, -1.9, 0.02), (s * 0.22, -0.6, 0.06), (s * 0.18, 0.05, 0.12), (s * 0.12, 0.26, 0.24), (s * 0.24, 0.20, GZ + 0.05), (x - s * 0.04, 0.08 - back, GZ + 0.08)]
        pts = L.bezier(pts[0], pts[1], pts[2], pts[3], 12) + L.bezier(pts[3], Vector(pts[3]) + Vector((0, 0.02, 0.1)), pts[4], pts[5], 8)[1:]
        chute(pts, 0.075, 0.03, ALUD)
        for i in range(len(pts) - 1):
            a, b = Vector(pts[i]), Vector(pts[i + 1])
            c = (a + b) / 2 + Vector((0, 0, 0.024))
            L.box(tuple(c), (0.055, (b - a).length * 0.95, 0.016), AMMO, bevel=0,
                  rot=Vector((0, 1, 0)).rotation_difference((b - a).normalized()).to_matrix().to_4x4())
    # ---- sight on its cradle in front of the face; hand grips
    L.box((0, 0.24, 0.58), (0.06, 0.06, 0.12), ALUD, bevel=0.008)                            # sight cradle
    L.tube([(-0.12, 0.26, 0.6), (-0.12, 0.24, 0.72), (0.12, 0.24, 0.72), (0.12, 0.26, 0.6)], 0.01, ALUD, segs=6)
    reflector_sight((0, 0.20, 0.68), (0, 1, 0), scale=0.95)
    L.box((0, 0.20, 0.47), (0.2, 0.1, 0.08), BLACK, bevel=0.012)                              # control unit
    for s in (-1, 1):
        L.cyl((s * 0.08, 0.20, 0.47), (s * 0.15, 0.17, 0.47), 0.016, STEEL)
        grip((s * 0.16, 0.16, 0.42), (0, -0.2, 1.0))
        L.box((s * 0.16, 0.14, 0.49), (0.015, 0.03, 0.035), RED, bevel=0.003)
    # elevation hydraulic jack and motors behind the armour plate (seen below the window)
    L.cyl((-0.14, 0.26, 0.12), (0.14, 0.26, 0.12), 0.055, BLACK, bevel=0.01)
    L.cyl((0, 0.24, 0.12), (0, 0.24, 0.36), 0.025, STEEL)
    L.cyl((0, 0.24, 0.36), (0, 0.24, 0.44), 0.035, ALUD)
    for s in (-1, 1):
        L.cyl((s * 0.20, 0.25, 0.05), (s * 0.20, 0.25, 0.3), 0.012, STEEL)
    # seat with its back to the doors; footrests; knee armour
    L.box((0, -0.18, 0.30), (0.34, 0.26, 0.06), LEATHER, bevel=0.02)
    L.box((0, -0.31, 0.56), (0.32, 0.05, 0.42), PAD, bevel=0.02, rot=Matrix.Rotation(0.12, 4, 'X'))
    for s in (-1, 1):
        L.box((s * 0.15, 0.27, 0.02), (0.12, 0.10, 0.02), ALUD, bevel=0.005, rot=Matrix.Rotation(0.5, 4, 'X'))
        L.box((s * 0.26, 0.12, 0.26), (0.01, 0.30, 0.30), ARMOR, bevel=0.003)
    # oxygen regulator, interphone, heated suit; emergency hand cranks
    L.box((-0.27, -0.18, 0.62), (0.05, 0.1, 0.13), BLACK, bevel=0.01)
    L.cyl((-0.245, -0.18, 0.64), (-0.24, -0.18, 0.64), 0.02, GAUGE)
    L.tube([(-0.26, -0.15, 0.55), (-0.15, -0.08, 0.5), (-0.06, -0.06, 0.62)], 0.012, HOSE)
    L.box((0.27, -0.18, 0.62), (0.05, 0.08, 0.1), BLACK, bevel=0.008)
    L.box((0.27, -0.26, 0.48), (0.05, 0.06, 0.08), BLACK, bevel=0.008)
    for s in (-1, 1):
        L.cyl((s * 0.28, -0.05, 0.15), (s * 0.25, -0.05, 0.15), 0.03, ALUD)
        L.box((s * 0.25, -0.05, 0.22), (0.015, 0.02, 0.14), STEEL, bevel=0.003)
    # ---- fuselage tail tunnel ahead of the turret: ammunition boxes and rails
    tun = lambda y: (0.52, 0.62, 0.5, 3.0, None)
    L.shell(-2.2, -0.38, tun, DKG, holes=[], name='tail_tunnel')
    for s in (-1, 1):
        L.box((s * 0.30, -1.95, 0.12), (0.24, 0.42, 0.40), OD, bevel=0.012)                 # 825-round box
        L.box((s * 0.30, -1.95, 0.325), (0.25, 0.43, 0.012), ALU, bevel=0.003)
    M = place(i0, C, yaw=math.pi)
    eye = (0, -0.08, 0.76)
    L.eye('eye_tail', world(M, eye), wdir(M, (0, 1, -0.02)))


{'top': build_top, 'ball': build_ball, 'tail': build_tail}[which]()
L.export(out)
print('wrote', out)
