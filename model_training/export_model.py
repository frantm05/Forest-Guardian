import subprocess
from ultralytics import YOLO

try:
    import ultralytics
    import onnx
    import onnxsim
except ImportError:
    print("installing ultralytics, onnx, and onnx-simplifier...")
    subprocess.check_call(['pip', 'install', 'ultralytics', 'onnx', 'onnx-simplifier', '--upgrade'])
    print("installation complete.")

best_model = YOLO("runs/segment/train7/weights/best.pt")

try:
    print("attempting onnx export...")
    path = best_model.export(format="onnx", imgsz=640, simplify=True)
    print(f"✅ ONNX export successful: {path}")
except Exception as e:
    print(f"❌ ONNX export failed: {e}")