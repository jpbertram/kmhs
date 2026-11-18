"""Small modelling kit for the B-24 crew-station builders (Blender bpy).

Authoring frame (Blender): X right, Y forward (nose), Z up, metres.
Origin = flight-deck floor centre at the pilot's eye station, matching the
refined flight-deck model, so every compartment shares one transform at
runtime (glTF: x right, y up, z aft).
"""
import bpy, bmesh, math, os
from mathutils import Vector, Matrix

TEX = os.environ.get('B24_TEX', 'tex')
_MATS = {}
_OBJS = []


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    _MATS.clear(); _OBJS.clear()


def mat(name, color=(.5, .5, .5), tex=None, rough=.7, metal=.1, alpha=1.0, emit=None, emit_strength=1.0):
    if name in _MATS:
        return _MATS[name]
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; p = nt.nodes['Principled BSDF']
    p.inputs['Base Color'].default_value = (*color, 1)
    p.inputs['Roughness'].default_value = rough
    p.inputs['Metallic'].default_value = metal
    if tex:
        im = bpy.data.images.load(os.path.join(TEX, tex + '.png'), check_existing=True)
        n = nt.nodes.new('ShaderNodeTexImage'); n.image = im
        nt.links.new(n.outputs['Color'], p.inputs['Base Color'])
    if alpha < 1:
        p.inputs['Alpha'].default_value = alpha
        if hasattr(m, 'surface_render_method'):
            m.surface_render_method = 'BLENDED'
        else:
            m.blend_method = 'BLEND'
        m.use_backface_culling = False
    if emit:
        p.inputs['Emission Color'].default_value = (*emit, 1)
        p.inputs['Emission Strength'].default_value = emit_strength
    _MATS[name] = m
    return m


def _obj(bm, m, name='part', tile=0.5, smooth=35):
    """Finish a bmesh: box-projected UVs (tile metres per texture), shading."""
    uv = bm.loops.layers.uv.verify()
    for f in bm.faces:
        n = f.normal; ax = max(range(3), key=lambda i: abs(n[i]))
        for l in f.loops:
            co = l.vert.co
            u, v = [(co.y, co.z), (co.x, co.z), (co.x, co.y)][ax]
            l[uv].uv = (u / tile, v / tile)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(ob)
    me.materials.append(m)
    if smooth:
        me.shade_smooth()
        if hasattr(me, 'set_sharp_from_angle'):
            me.set_sharp_from_angle(angle=math.radians(smooth))
    else:
        me.shade_flat()
    _OBJS.append(ob)
    return ob


def _xform(bm, loc=(0, 0, 0), rot=None, scale=None):
    M = Matrix.Translation(Vector(loc))
    if rot is not None:
        M = M @ (rot if isinstance(rot, Matrix) else rot.to_matrix().to_4x4())
    if scale is not None:
        S = Matrix.Diagonal((*scale, 1))
        M = M @ S
    bmesh.ops.transform(bm, matrix=M, verts=bm.verts)


def align(z_to):
    """Rotation matrix taking +Z to direction z_to."""
    d = Vector(z_to).normalized()
    return Vector((0, 0, 1)).rotation_difference(d).to_matrix().to_4x4()


def box(c, s, m, bevel=0.012, segs=2, rot=None, tile=0.5, name='box'):
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1)
    bmesh.ops.scale(bm, vec=Vector(s), verts=bm.verts)
    if bevel:
        bmesh.ops.bevel(bm, geom=list(bm.edges), offset=min(bevel, min(s) * 0.45), segments=segs, profile=0.5, affect='EDGES')
    _xform(bm, c, rot)
    return _obj(bm, m, name, tile, smooth=40 if bevel else 0)


def cyl(p0, p1, r, m, segs=24, r1=None, cap=True, bevel=0.0, tile=0.5, name='cyl'):
    p0, p1 = Vector(p0), Vector(p1); L = (p1 - p0).length
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=cap, cap_tris=False, segments=segs, radius1=r, radius2=r if r1 is None else r1, depth=L)
    if bevel and cap:
        edges = [e for e in bm.edges if all(abs(abs(v.co.z) - L / 2) < 1e-6 for v in e.verts) and len(e.link_faces) == 2]
        bmesh.ops.bevel(bm, geom=edges, offset=bevel, segments=2, profile=0.5, affect='EDGES')
    _xform(bm, (p0 + p1) / 2, align(p1 - p0))
    return _obj(bm, m, name, tile, smooth=50)


def sphere(c, r, m, scale=(1, 1, 1), segs=24, rings=12, name='sph', tile=0.5, rot=None):
    bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=segs, v_segments=rings, radius=r)
    _xform(bm, c, rot, scale)
    return _obj(bm, m, name, tile, smooth=80)


def lathe(profile, base, axis, m, segs=32, name='lathe', tile=0.5, closed_ends=False, arc=None):
    """profile: [(radius, height)] revolved about axis through base."""
    bm = bmesh.new(); rings = []
    n = segs if arc is None else segs + 1
    for (r, h) in profile:
        ring = []
        for k in range(n):
            a = (arc[0] + (arc[1] - arc[0]) * k / segs) if arc else 2 * math.pi * k / segs
            ring.append(bm.verts.new((r * math.cos(a), r * math.sin(a), h)))
        rings.append(ring)
    for i in range(len(rings) - 1):
        for k in range(segs):
            k2 = (k + 1) % n if arc is None else k + 1
            try:
                bm.faces.new((rings[i][k], rings[i][k2], rings[i + 1][k2], rings[i + 1][k]))
            except ValueError:
                pass
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-6)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    _xform(bm, base, align(axis))
    return _obj(bm, m, name, tile, smooth=60)


def _frames_along(pts, up_hint=None):
    """Parallel-transport frames for a polyline."""
    T = []
    for i in range(len(pts)):
        a = pts[max(0, i - 1)]; b = pts[min(len(pts) - 1, i + 1)]
        T.append((b - a).normalized())
    up = Vector(up_hint or (0, 0, 1))
    if abs(T[0].dot(up)) > 0.95:
        up = Vector((1, 0, 0))
    N = [T[0].cross(up).normalized()]
    for i in range(1, len(pts)):
        n = N[-1] - T[i] * N[-1].dot(T[i])
        N.append(n.normalized() if n.length > 1e-9 else N[-1])
    return T, N


def sweep(points, profile, m, closed=False, cap=True, name='sweep', tile=0.5, smooth=45, up=None):
    """Sweep a 2D profile [(u,v)] along points; u along N, v along B=T x N."""
    pts = [Vector(p) for p in points]
    T, N = _frames_along(pts, up)
    bm = bmesh.new(); rings = []
    for p, t, n in zip(pts, T, N):
        b = t.cross(n)
        rings.append([bm.verts.new(p + n * u + b * v) for (u, v) in profile])
    k = len(profile)
    seq = range(len(rings)) if closed else range(len(rings) - 1)
    for i in seq:
        r0, r1 = rings[i], rings[(i + 1) % len(rings)]
        for j in range(k):
            try:
                bm.faces.new((r0[j], r0[(j + 1) % k], r1[(j + 1) % k], r1[j]))
            except ValueError:
                pass
    if cap and not closed:
        for r in (rings[0], rings[-1]):
            try:
                bm.faces.new(r)
            except ValueError:
                pass
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return _obj(bm, m, name, tile, smooth)


def circle(r, n=12):
    return [(r * math.cos(2 * math.pi * i / n), r * math.sin(2 * math.pi * i / n)) for i in range(n)]


def rrect(w, h, r, n=4):
    """Rounded rectangle outline (centred), counter-clockwise."""
    out = []
    for cx, cy, a0 in [(w / 2 - r, h / 2 - r, 0), (-w / 2 + r, h / 2 - r, 90), (-w / 2 + r, -h / 2 + r, 180), (w / 2 - r, -h / 2 + r, 270)]:
        for k in range(n + 1):
            a = math.radians(a0 + 90 * k / n)
            out.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return out


def tube(points, r, m, segs=10, name='tube', closed=False, smooth=60):
    return sweep(points, circle(r, segs), m, closed=closed, name=name, smooth=smooth)


def bezier(p0, p1, p2, p3, n=16):
    p0, p1, p2, p3 = map(Vector, (p0, p1, p2, p3))
    return [p0 * (1 - t) ** 3 + p1 * 3 * t * (1 - t) ** 2 + p2 * 3 * t * t * (1 - t) + p3 * t ** 3 for t in [i / n for i in range(n + 1)]]


def panel(c, w, h, m, normal=(0, 1, 0), up=(0, 0, 1), name='panel', thick=0.004):
    """Thin textured plate whose texture spans exactly 0..1 across its face."""
    nrm = Vector(normal).normalized(); upv = Vector(up).normalized(); right = upv.cross(nrm).normalized(); upv = nrm.cross(right)
    bm = bmesh.new(); uvl = bm.loops.layers.uv.verify()
    c = Vector(c)
    corners = [(-w / 2, -h / 2), (w / 2, -h / 2), (w / 2, h / 2), (-w / 2, h / 2)]
    vs = [bm.verts.new(c + right * x + upv * y + nrm * thick) for x, y in corners]
    f = bm.faces.new(vs)
    for l, (x, y) in zip(f.loops, corners):
        l[uvl].uv = (x / w + .5, y / h + .5)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(ob); me.materials.append(m)
    _OBJS.append(ob)
    return ob


# ---------------------------------------------------------------- fuselage

def superellipse(a, b, zc, n=3.0, k=48, z_floor=None):
    """Closed section points (x,z), starting at top, going round."""
    pts = []
    for i in range(k):
        t = 2 * math.pi * i / k
        c, s = math.cos(t), math.sin(t)
        x = a * math.copysign(abs(s) ** (2 / n), s)
        z = zc + b * math.copysign(abs(c) ** (2 / n), c)
        if z_floor is not None:
            z = max(z, z_floor)
        pts.append((x, z))
    return pts


def shell(y0, y1, section, m, step=0.04, k=64, holes=(), name='shell', tile=0.6, inside=True, only=None, thick=-0.012):
    """Skin from y0 (aft) to y1 (fore). section(y) -> (a, b, zc, n, zfloor).
    holes: callables hole(y, x, z) -> True if the quad centre is open."""
    bm = bmesh.new(); ny = max(2, int(abs(y1 - y0) / step) + 1)
    rings = []
    for i in range(ny):
        y = y0 + (y1 - y0) * i / (ny - 1)
        a, b, zc, n, zf = section(y)
        rings.append([bm.verts.new((x, y, z)) for x, z in superellipse(a, b, zc, n, k, zf)])
    for i in range(ny - 1):
        for j in range(k):
            q = (rings[i][j], rings[i][(j + 1) % k], rings[i + 1][(j + 1) % k], rings[i + 1][j])
            cen = sum((v.co for v in q), Vector()) / 4
            if only is not None:
                if not only(cen.y, cen.x, cen.z):
                    continue
            elif any(h(cen.y, cen.x, cen.z) for h in holes):
                continue
            try:
                f = bm.faces.new(q if inside else q[::-1])
            except ValueError:
                pass
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    loose = [v for v in bm.verts if not v.link_faces]
    bmesh.ops.delete(bm, geom=loose, context='VERTS')
    for f in bm.faces:
        f.normal_update()
    # thickness so the skin reads as metal, not a sheet of paper
    if thick:
        bmesh.ops.solidify(bm, geom=list(bm.faces), thickness=thick)
    return _obj(bm, m, name, tile, smooth=50)


def ring_frame(y, section, m, depth=0.07, width=0.035, k=64, skip=None, name='frame', inset=0.0):
    a, b, zc, n, zf = section(y)
    pts = superellipse(a - inset, b - inset, zc, n, k, zf)
    loop = []
    for (x, z) in pts:
        if skip and skip(x, z):
            if loop:
                yield_open = True
            continue
        loop.append(Vector((x, y, z)))
    # inward offset profile: u = toward section centre, v = along Y
    prof = [(0, -width / 2), (depth, -width / 2), (depth, width / 2), (0, width / 2)]
    return sweep_section_ring(loop, (0, y, zc), prof, m, closed=skip is None, name=name)


def sweep_section_ring(loop, centre, prof, m, closed=True, name='frame'):
    c = Vector(centre); bm = bmesh.new(); rings = []
    for p in loop:
        inward = Vector((c.x - p.x, 0, c.z - p.z)).normalized()
        rings.append([bm.verts.new(p + inward * u + Vector((0, 1, 0)) * v) for (u, v) in prof])
    kk = len(prof)
    for i in range(len(rings) if closed else len(rings) - 1):
        r0, r1 = rings[i], rings[(i + 1) % len(rings)]
        if (r0[0].co - r1[0].co).length > 0.3:
            continue  # gap where a hole skipped points
        for j in range(kk):
            try:
                bm.faces.new((r0[j], r0[(j + 1) % kk], r1[(j + 1) % kk], r1[j]))
            except ValueError:
                pass
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return _obj(bm, m, name, 0.5, smooth=30)


def stringer(y0, y1, section, t, m, inset=0.0, size=(0.03, 0.022), steps=8, name='stringer'):
    """Longitudinal stiffener at section parameter t (0..1 around from top)."""
    pts = []
    for i in range(steps + 1):
        y = y0 + (y1 - y0) * i / steps
        a, b, zc, n, zf = section(y)
        ang = 2 * math.pi * t; c, s = math.cos(ang), math.sin(ang)
        x = a * math.copysign(abs(s) ** (2 / n), s); z = zc + b * math.copysign(abs(c) ** (2 / n), c)
        if zf is not None and z < zf:
            return None
        inward = Vector((-x, 0, zc - z)).normalized()
        pts.append(Vector((x, y, z)) + inward * (inset + size[1] / 2))
    w, h = size
    return sweep(pts, [(-h / 2, -w / 2), (h / 2, -w / 2), (h / 2, w / 2), (-h / 2, w / 2)], m, name=name, smooth=20, up=(0, 0, 1))


def window_frame(points3d, m, r=0.022, name='winframe'):
    return sweep(points3d, circle(r, 8), m, closed=True, name=name, smooth=60)


def eye(name, loc, look):
    cam = bpy.data.objects.new(name, bpy.data.cameras.new(name))
    bpy.context.scene.collection.objects.link(cam)
    cam.location = Vector(loc)
    cam.rotation_euler = Vector(look).normalized().to_track_quat('-Z', 'Y').to_euler()
    return cam


def join_by_material():
    """Merge all parts per material: one draw call per material at runtime."""
    groups = {}
    for ob in list(_OBJS):
        if ob.name not in bpy.data.objects:
            continue
        groups.setdefault(ob.data.materials[0].name, []).append(ob)
    for name, obs in groups.items():
        bpy.ops.object.select_all(action='DESELECT')
        for o in obs:
            o.select_set(True)
        bpy.context.view_layer.objects.active = obs[0]
        if len(obs) > 1:
            bpy.ops.object.join()
        obs[0].name = name; obs[0].data.name = name


def export(path):
    join_by_material()
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', export_yup=True, export_apply=True,
                              export_cameras=True, export_lights=False, export_image_format='JPEG',
                              export_jpeg_quality=86)


def section_x(section, y, z, side):
    a, b, zc, n, zf = section(y)
    t = min(1.0, abs((z - zc) / b))
    return side * a * (1 - t ** n) ** (1 / n)


def side_window(section, side, yc, zc, w, h, r, m_frame, m_glass, frame_r=0.024, inset=0.0):
    """Rounded window cut into a side wall. Returns (hole predicate)."""
    outline = rrect(w, h, r, 5)
    pts = [Vector((section_x(section, yc + u, zc + v, side) - side * inset, yc + u, zc + v)) for (u, v) in outline]
    window_frame(pts, m_frame, frame_r)
    def hole(y, x, z):
        if x * side <= 0:
            return False
        u, v = y - yc, z - zc
        if abs(u) > w / 2 or abs(v) > h / 2:
            return False
        du, dv = max(0, abs(u) - (w / 2 - r)), max(0, abs(v) - (h / 2 - r))
        return du * du + dv * dv <= r * r
    return hole


def bulkhead(y, section, m, holes=(), step=0.03, name='bulkhead', facing=1, tile=0.6):
    """Flat wall filling the section at y; holes(x, z) -> True to leave open."""
    a, b, zc, n, zf = section(y)
    bm = bmesh.new()
    nx, nz = int(2 * a / step) + 1, int(2 * b / step) + 1
    for i in range(nx):
        for j in range(nz):
            x0, z0 = -a + i * step, zc - b + j * step
            xc, zcen = x0 + step / 2, z0 + step / 2
            t = abs((zcen - zc) / b)
            if t >= 1 or abs(xc) > a * (1 - t ** n) ** (1 / n):
                continue
            if zf is not None and zcen < zf:
                continue
            if any(h(xc, zcen) for h in holes):
                continue
            vs = [bm.verts.new((x0, y, z0)), bm.verts.new((x0 + step, y, z0)), bm.verts.new((x0 + step, y, z0 + step)), bm.verts.new((x0, y, z0 + step))]
            bm.faces.new(vs if facing > 0 else vs[::-1])
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-6)
    bmesh.ops.solidify(bm, geom=list(bm.faces), thickness=0.01)
    return _obj(bm, m, name, tile, smooth=0)


def slab(poly, z, thick, m, bevel=0.006, name='slab', tile=0.5):
    """Extrude a horizontal polygon [(x,y)] from z-thick to z, edges softened."""
    bm = bmesh.new()
    vs = [bm.verts.new((x, y, z - thick)) for (x, y) in poly]
    f = bm.faces.new(vs)
    ret = bmesh.ops.extrude_face_region(bm, geom=[f])
    top = [e for e in ret['geom'] if isinstance(e, bmesh.types.BMVert)]
    bmesh.ops.translate(bm, vec=Vector((0, 0, thick)), verts=top)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    if bevel:
        bmesh.ops.bevel(bm, geom=list(bm.edges), offset=bevel, segments=2, profile=0.5, affect='EDGES')
    return _obj(bm, m, name, tile, smooth=40)


def rounded_poly(pts, r, n=4):
    """Round every corner of a convex-ish polygon by radius r."""
    out = []
    P = [Vector((x, y)) for x, y in pts]
    for i, p in enumerate(P):
        a, b = P[i - 1], P[(i + 1) % len(P)]
        d1, d2 = (a - p).normalized(), (b - p).normalized()
        c1, c2 = p + d1 * r, p + d2 * r
        for k in range(n + 1):
            t = k / n
            q = c1 * (1 - t) ** 2 + p * 2 * t * (1 - t) + c2 * t * t
            out.append((q.x, q.y))
    return out
