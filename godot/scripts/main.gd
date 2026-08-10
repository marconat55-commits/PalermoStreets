extends Node2D

const VIEWPORT := Vector2(1280.0, 720.0)
const MOVE_SPEED := Vector2(360.0, 220.0)
const MARCO_HEIGHT := 290.0
const MODULE_COLORS := [Color("#9d6038"), Color("#78533d"), Color("#8c633d"), Color("#6f4d3a")]

var stage: Dictionary
var modules: Array
var module_index := 0
var player_feet := Vector2.ZERO
var camera_x := 0.0
var far_layer := Node2D.new()
var main_layer := Node2D.new()
var actors := Node2D.new()
var player_shape := Polygon2D.new()
var hud := Label.new()

func _ready() -> void:
    stage = JSON.parse_string(FileAccess.get_file_as_string("res://data/stage1_greybox.json"))
    modules = stage.modules
    add_child(far_layer)
    add_child(main_layer)
    add_child(actors)
    player_shape.polygon = PackedVector2Array([
        Vector2(-34, -MARCO_HEIGHT), Vector2(34, -MARCO_HEIGHT),
        Vector2(42, -8), Vector2(-42, -8)
    ])
    player_shape.color = Color("#f4ede1")
    actors.add_child(player_shape)
    var ui := CanvasLayer.new()
    add_child(ui)
    hud.position = Vector2(24, 20)
    hud.add_theme_font_size_override("font_size", 22)
    hud.add_theme_color_override("font_color", Color.WHITE)
    ui.add_child(hud)
    _enter_module(0)

func _process(delta: float) -> void:
    var direction := Input.get_vector("move_left", "move_right", "move_up", "move_down")
    player_feet += direction * MOVE_SPEED * delta
    var module: Dictionary = modules[module_index]
    var walk: Array = module.walk_y
    player_feet.x = clampf(player_feet.x, 45.0, float(module.world_width) - 45.0)
    player_feet.y = clampf(player_feet.y, float(walk[0]), float(walk[1]))
    var target := clampf(player_feet.x - VIEWPORT.x * 0.5, 0.0, float(module.world_width) - VIEWPORT.x)
    camera_x = lerpf(camera_x, target, 1.0 - exp(-7.0 * delta))
    main_layer.position.x = -camera_x
    actors.position.x = -camera_x
    far_layer.position.x = -camera_x * float(module.far_parallax)
    player_shape.position = player_feet
    _update_hud(module, walk)
    queue_redraw()

func _unhandled_key_input(event: InputEvent) -> void:
    if not event.pressed or event.echo:
        return
    if event.keycode >= KEY_1 and event.keycode <= KEY_4:
        _enter_module(int(event.keycode - KEY_1))

func _enter_module(index: int) -> void:
    module_index = clampi(index, 0, modules.size() - 1)
    var module: Dictionary = modules[module_index]
    var entry: Array = module.entry
    player_feet = Vector2(float(entry[0]), float(entry[1]))
    camera_x = 0.0
    _rebuild_layers(module)

func _rebuild_layers(module: Dictionary) -> void:
    for child in far_layer.get_children(): child.queue_free()
    for child in main_layer.get_children(): child.queue_free()
    var width := float(module.world_width)
    var sky := Polygon2D.new()
    sky.polygon = PackedVector2Array([Vector2(0, 0), Vector2(width, 0), Vector2(width, 330), Vector2(0, 330)])
    sky.color = Color("#ca6035")
    far_layer.add_child(sky)
    for x in range(0, int(width), 240):
        var block := Polygon2D.new()
        var height := 150.0 + float((x / 240) % 4) * 24.0
        block.polygon = PackedVector2Array([Vector2(x, 330-height), Vector2(x+205, 330-height), Vector2(x+205, 330), Vector2(x, 330)])
        block.color = Color("#4c3b45")
        far_layer.add_child(block)
    var architecture := Polygon2D.new()
    architecture.polygon = PackedVector2Array([Vector2(0, 220), Vector2(width, 220), Vector2(width, 540), Vector2(0, 540)])
    architecture.color = MODULE_COLORS[module_index]
    main_layer.add_child(architecture)
    var ground := Polygon2D.new()
    ground.polygon = PackedVector2Array([Vector2(0, 540), Vector2(width, 540), Vector2(width, 720), Vector2(0, 720)])
    ground.color = Color("#493c37")
    main_layer.add_child(ground)
    var walk: Array = module.walk_y
    var band := Polygon2D.new()
    band.polygon = PackedVector2Array([
        Vector2(0, float(walk[0])), Vector2(width, float(walk[0])),
        Vector2(width, float(walk[1])), Vector2(0, float(walk[1]))
    ])
    band.color = Color(0.13, 0.72, 0.43, 0.24)
    main_layer.add_child(band)

func _update_hud(module: Dictionary, walk: Array) -> void:
    hud.text = "%s - %s\nWALK Y: %d-%d | Marco: 290 px, feet anchor | Frecce muovono | 1-4 cambiano modulo" % [
        module.id, module.name, int(walk[0]), int(walk[1])
    ]

func _draw() -> void:
    draw_rect(Rect2(0, 0, VIEWPORT.x, VIEWPORT.y), Color("#17131a"))

