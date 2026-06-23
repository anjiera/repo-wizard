# GDScript Godot Game Engine Performance Patterns

This document defines performance optimization patterns and standards for Godot engine scripting.

---

## 1. Node Reference & Access Optimization
* **Node Path Caching**: Use `@onready` to cache node references on startup instead of repeatedly calling `get_node()` or `$` inside loops.
  ```gdscript
  @onready var sprite = $Sprite2D
  ```
* **Avoid Dynamic Loading**: Never load resources inside `_process()` or `_physics_process()`. Preload them at script initialization.
  ```gdscript
  const BULLET_SCENE = preload("res://scenes/bullet.tscn")
  ```

---

## 2. Process Scheduling Loop Boundaries
* **Frame Loops**: Keep `_process()` and `_physics_process()` lightweight. Offload calculations into signals or timer tick intervals.
* **Vector Math**: Utilize Godot's built-in C++ vector arithmetic (e.g. `Vector2.distance_to()`) instead of writing custom math loops in GDScript.

---

## 3. Compiler Typing Optimizations
* **Static Typing**: Use static types for all variables and parameters in GDScript. The compiler uses type information to optimize bytecode execution.
  ```gdscript
  var speed: float = 150.0
  func process_input(delta: float) -> void:
      position.x += speed * delta
  ```
* **Typed Arrays**: Use typed arrays to avoid dynamic list overhead.
  ```gdscript
  var active_enemies: Array[Node2D] = []
  ```
