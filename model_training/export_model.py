# ==============================================================
# EXPORT – spouštěj SAMOSTATNĚ po instalaci závislostí
# ==============================================================

import subprocess
from ultralytics import YOLO

# ensure ultralytics, onnx, and onnx-simplifier are installed
try:
    import ultralytics
    import onnx
    import onnxsim
except ImportError:
    print("installing ultralytics, onnx, and onnx-simplifier...")
    subprocess.check_call(['pip', 'install', 'ultralytics', 'onnx', 'onnx-simplifier', '--upgrade'])
    print("installation complete.")

# Použij NEJLEPŠÍ model = Fáze 1 (train2)
# this path assumes you have already run the training script and a best.pt model exists at this location.
best_model = YOLO("runs/segment/train9/weights/best.pt")


# --- Pokus 2: ONNX (záloha) ---
try:
    print("attempting onnx export...")
    path = best_model.export(format="onnx", imgsz=800, simplify=True)
    print(f"✅ ONNX export successful: {path}")
except Exception as e:
    print(f"❌ ONNX export failed: {e}")

