"""Create a disposable rigged mannequin used to smoke-test the export pipeline."""
from __future__ import annotations

import argparse
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector


def arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, required=True)
    values = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    return parser.parse_args(values)


def material(name: str, color: tuple[float, float, float, float]) -> bpy.types.Material:
    value = bpy.data.materials.new(name)
    value.diffuse_color = color
    value.use_nodes = True
    shader = value.node_tree.nodes.get("Principled BSDF")
    if shader:
        shader.inputs["Base Color"].default_value = color
        shader.inputs["Roughness"].default_value = 0.75
    return value


def add_ellipsoid(name: str, location: tuple[float, float, float], scale: tuple[float, float, float], mat: bpy.types.Material, parent: bpy.types.Object) -> None:
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=12, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    obj.data.materials.append(mat)
    obj.parent = parent


def add_limb(name: str, start: tuple[float, float, float], end: tuple[float, float, float], radius: float, mat: bpy.types.Material, parent: bpy.types.Object) -> None:
    midpoint = tuple((a + b) / 2 for a, b in zip(start, end))
    length = math.dist(start, end)
    bpy.ops.mesh.primitive_cylinder_add(vertices=20, radius=radius, depth=length, location=midpoint)
    obj = bpy.context.object
    obj.name = name
    direction = (end[0] - start[0], end[1] - start[1], end[2] - start[2])
    obj.rotation_mode = "QUATERNION"
    obj.rotation_quaternion = Vector(direction).to_track_quat("Z", "Y")
    obj.data.materials.append(mat)
    obj.parent = parent


def main() -> None:
    args = arguments()
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    if scene.world is None:
        scene.world = bpy.data.worlds.new("PS_World")
    scene.world.color = (0.025, 0.025, 0.025)

    collection = bpy.data.collections.new("PS_Character")
    scene.collection.children.link(collection)
    armature = bpy.data.armatures.new("PS_Rig_Data")
    rig = bpy.data.objects.new("PS_Rig", armature)
    collection.objects.link(rig)
    bpy.context.view_layer.objects.active = rig
    rig.select_set(True)
    bpy.ops.object.mode_set(mode="EDIT")
    bone = armature.edit_bones.new("root")
    bone.head = (0, 0, 0)
    bone.tail = (0, 0, 2)
    bpy.ops.object.mode_set(mode="OBJECT")

    skin = material("PilotSkin", (0.72, 0.32, 0.12, 1.0))
    cloth = material("PilotCloth", (0.9, 0.9, 0.82, 1.0))
    accent = material("PilotAccent", (0.65, 0.02, 0.02, 1.0))
    add_ellipsoid("Torso", (0, 0, 2.7), (0.62, 0.34, 0.9), cloth, rig)
    add_ellipsoid("Head", (0, 0, 4.05), (0.42, 0.38, 0.5), skin, rig)
    add_limb("LegL", (-0.28, 0, 1.85), (-0.42, 0, 0.28), 0.2, cloth, rig)
    add_limb("LegR", (0.28, 0, 1.85), (0.42, 0, 0.28), 0.2, cloth, rig)
    add_limb("ArmL", (-0.5, 0, 3.25), (-0.95, 0, 2.35), 0.15, skin, rig)
    add_limb("ArmR", (0.5, 0, 3.25), (0.95, 0, 2.55), 0.15, skin, rig)
    add_ellipsoid("Sash", (0, -0.02, 2.0), (0.66, 0.37, 0.16), accent, rig)

    rig.animation_data_create()
    action = bpy.data.actions.new("PS_idle")
    rig.animation_data.action = action
    for frame, z_value in ((1, 0.0), (2, 0.06), (3, 0.0), (4, -0.025)):
        rig.location.z = z_value
        rig.keyframe_insert(data_path="location", frame=frame, index=2)

    camera_data = bpy.data.cameras.new("PS_Camera_Data")
    camera_data.type = "ORTHO"
    camera_data.ortho_scale = 5.6
    camera = bpy.data.objects.new("PS_Camera", camera_data)
    scene.collection.objects.link(camera)
    camera.location = (0, -12, 2.35)
    camera.rotation_euler = (math.radians(90), 0, 0)
    scene.camera = camera

    bpy.ops.object.light_add(type="AREA", location=(-4, -5, 7))
    bpy.context.object.data.energy = 900
    bpy.context.object.data.shape = "DISK"
    bpy.context.object.data.size = 5
    bpy.ops.object.light_add(type="AREA", location=(4, -2, 4))
    bpy.context.object.data.energy = 500
    bpy.context.object.data.size = 4

    scene.frame_start = 1
    scene.frame_end = 4
    args.output.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(args.output.resolve()))
    print(f"PS_PILOT_SAVED {args.output.resolve()}")


if __name__ == "__main__":
    main()
