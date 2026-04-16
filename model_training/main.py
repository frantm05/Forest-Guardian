# ==============================================================
# OPTIMÁLNÍ YOLO26s-seg trénink pro malý dataset (~130 img)
# Lightning.ai + NVIDIA RTX PRO 6000 (102 GB VRAM)
# ==============================================================

import subprocess
subprocess.run(["pip", "install", "roboflow", "ultralytics", "--upgrade"], check=True)

import torch
import os

# --- GPU info ---
if torch.cuda.is_available():
    gpu = torch.cuda.get_device_properties(0)
    print(f"GPU: {gpu.name}")
    vram_gb = gpu.total_memory / (1024**3)
    print(f"VRAM: {vram_gb:.1f} GB")


from roboflow import Roboflow
rf = Roboflow(api_key="6G82blb1sshjVBAgYvrh")
project = rf.workspace("matjs-workspace-ddjlh").project("pozerky")
version = project.version(11)
dataset = version.download("yolo26")
                

from ultralytics import YOLO

# ---------------------------------------------------------------
# STRATEGIE: Jeden kvalitní fine-tuning z nejlepšího checkpointu
# Nepoužívej triple fine-tuning — model se přetrénuje
# ---------------------------------------------------------------
model = YOLO("runs/segment/train_optimized/weights/best.pt")

results = model.train(
    data=f"{dataset.location}/data.yaml",

    # === TRÉNINKOVÉ PARAMETRY ===
    epochs=500,
    patience=80,             # Dost trpělivosti pro malý dataset
    imgsz=800,               # 800px pro lepší detail požerků
    batch=16,                # 16 je optimální pro stabilitu gradientů

    # === LEARNING RATE ===
    freeze=0,
    lr0=5e-05,               # ← SWEET SPOT z tvých experimentů
    lrf=0.01,
    warmup_epochs=5,         # 5 epoch warmup — ne 3, ne 10
    warmup_bias_lr=0.05,
    warmup_momentum=0.8,
    cos_lr=True,
    optimizer="AdamW",
    weight_decay=0.0005,

    # === LOSS WEIGHTS ===
    cls=1.5,                 # Vyšší váha pro klasifikaci (2 třídy)
    box=7.5,                 # Default
    dfl=1.5,                 # Default

    # === REGULARIZACE ===
    dropout=0.05,            # Lehký dropout — víc způsobí underfitting

    # === AUGMENTACE — KONZERVATIVNÍ PRO MALÝ DATASET ===
    # Geometrické (mírné)
    degrees=8.0,             # Rotace max 8° — požerky na dřevu mají orientaci
    translate=0.1,
    scale=0.3,               # Zoom ±30%
    shear=2.0,               # Minimální shear
    perspective=0.0,         # BEZ perspektivy — zkresluje masky
    fliplr=0.5,              # Horizontální flip OK
    flipud=0.0,              # Vertikální flip NE — požerky mají orientaci

    # Fotometrické (střední)
    hsv_h=0.015,             # Hue ±1.5% — jemná změna barvy
    hsv_s=0.4,               # Saturace ±40%
    hsv_v=0.3,               # Jas ±30%

    # Pokročilé
    mosaic=1.0,              # Mosaic ON — synteticky zvětšuje dataset 4×
    close_mosaic=15,         # Vypnout mosaic posledních 15 epoch
    mixup=0.0,               # ❌ BEZ MIXUP — na malém datasetu škodí!
    copy_paste=0.15,         # Mírný copy-paste — pomáhá segmentaci
    copy_paste_mode="flip",
    erasing=0.1,             # Mírný random erasing
    auto_augment="",         # BEZ auto_augment — interferuje s manuálním nastavením

    # === OSTATNÍ ===
    cache="disk",            # Disk cache pro determinismus
    deterministic=True,
    seed=42,
    plots=True,
    save=True,
    save_period=25,
    workers=4,
)

# --- Výsledky ---
from pathlib import Path

train_dir = Path(str(results.save_dir))
print(f"\n📁 Výsledky: {train_dir}")

# --- Validace ---
best_weights = train_dir / "weights" / "best.pt"
if best_weights.exists():
    best_model = YOLO(str(best_weights))
    val_results = best_model.val(data=f"{dataset.location}/data.yaml", plots=True)

    print(f"\n📈 CELKOVÉ METRIKY:")
    print(f"   Box  mAP50:    {val_results.box.map50:.4f}")
    print(f"   Box  mAP50-95: {val_results.box.map:.4f}")
    print(f"   Mask mAP50:    {val_results.seg.map50:.4f}")
    print(f"   Mask mAP50-95: {val_results.seg.map:.4f}")

    names = val_results.names
    for i, name in names.items():
        print(f"\n   [{name}]")
        print(f"     Box  mAP50:    {val_results.box.ap50[i]:.4f}")
        print(f"     Box  mAP50-95: {val_results.box.map:.4f}")
        print(f"     Mask mAP50:    {val_results.seg.ap50[i]:.4f}")
        print(f"     Mask mAP50-95: {val_results.seg.map:.4f}")

    # --- Export ---
    try:
        export_path = best_model.export(format="tflite", imgsz=640)
        print(f"\n✅ TFLite: {export_path}")
    except Exception as e:
        print(f"\n⚠️ TFLite selhal: {e}")
        export_path = best_model.export(format="onnx", imgsz=640, simplify=True)
        print(f"✅ ONNX: {export_path}")