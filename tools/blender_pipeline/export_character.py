"""Run inside Blender: render every manifest action to transparent source PNGs."""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import bpy


def arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    values = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    return parser.parse_args(values)


def main() -> None:
    args = arguments()
    manifest_path = args.manifest.resolve()
    output_root = args.output.resolve()
    data = json.loads(manifest_path.read_text(encoding="utf-8-sig"))
    if data.get("schema") != 1:
        raise RuntimeError("Unsupported Blender character manifest schema")

    scene = bpy.context.scene
    rig = bpy.data.objects.get(data["rig_object"])
    camera = bpy.data.objects.get(data["camera_object"])
    collection = bpy.data.collections.get(data["character_collection"])
    if rig is None or rig.type != "ARMATURE":
        raise RuntimeError(f"Armature missing: {data['rig_object']}")
    if camera is None or camera.type != "CAMERA":
        raise RuntimeError(f"Camera missing: {data['camera_object']}")
    if collection is None:
        raise RuntimeError(f"Character collection missing: {data['character_collection']}")
    if camera.data.type != "ORTHO":
        raise RuntimeError("PS_Camera must be orthographic to lock apparent scale")

    settings = data["render"]
    scene.camera = camera
    try:
        scene.render.engine = "BLENDER_EEVEE_NEXT"
    except TypeError:
        scene.render.engine = "BLENDER_EEVEE"
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.resolution_x = int(settings["source_width"])
    scene.render.resolution_y = int(settings["source_height"])
    scene.render.resolution_percentage = 100
    scene.render.image_settings.color_depth = "8"
    scene.render.image_settings.compression = 15
    scene.render.use_file_extension = True

    for clip_name, clip in data["clips"].items():
        action = bpy.data.actions.get(clip["action"])
        if action is None:
            raise RuntimeError(f"Action missing for {clip_name}: {clip['action']}")
        rig.animation_data_create()
        rig.animation_data.action = action
        clip_dir = output_root / "raw" / clip_name
        clip_dir.mkdir(parents=True, exist_ok=True)
        frames = list(range(int(clip["start"]), int(clip["end"]) + 1, int(clip.get("step", 1))))
        for output_index, source_frame in enumerate(frames, start=1):
            scene.frame_set(source_frame)
            bpy.context.view_layer.update()
            scene.render.filepath = str(clip_dir / f"{output_index:02d}.png")
            bpy.ops.render.render(write_still=True)
        print(f"PS_RENDER {clip_name}: {len(frames)} frames")

    receipt = {
        "schema": 1,
        "character_id": data["character_id"],
        "blend_file": bpy.data.filepath,
        "blender_version": bpy.app.version_string,
        "clips": {name: len(list(range(int(spec["start"]), int(spec["end"]) + 1, int(spec.get("step", 1))))) for name, spec in data["clips"].items()},
    }
    output_root.mkdir(parents=True, exist_ok=True)
    (output_root / "render_receipt.json").write_text(json.dumps(receipt, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
