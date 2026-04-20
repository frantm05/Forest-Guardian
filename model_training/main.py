import subprocess
subprocess.run(["pip", "install", "roboflow", "ultralytics", "--upgrade"], check=True)

import torch
import os

from roboflow import Roboflow
rf = Roboflow(api_key="APIKEY")
project = rf.workspace("matjs-workspace-ddjlh").project("pozerky")
version = project.version(11)
dataset = version.download("yolo26")
                

from ultralytics import YOLO

model = YOLO("runs/segment/train_optimized/weights/best.pt")

results = model.train(
    data=f"{dataset.location}/data.yaml",

    epochs=500,
    patience=80,             
    imgsz=800,               
    batch=16,                

    freeze=0,
    lr0=5e-05,               
    lrf=0.01,
    warmup_epochs=5,         
    warmup_bias_lr=0.05,
    warmup_momentum=0.8,
    cos_lr=True,
    optimizer="AdamW",
    weight_decay=0.0005,

    cls=1.5,                 
    box=7.5,                 
    dfl=1.5,                 

    dropout=0.05,            

    degrees=8.0,             
    translate=0.1,
    scale=0.3,               
    shear=2.0,               
    perspective=0.0,         
    fliplr=0.5,              
    flipud=0.0,              

    hsv_h=0.015,             
    hsv_s=0.4,              
    hsv_v=0.3,               

    mosaic=1.0,              
    close_mosaic=15,        
    mixup=0.0,              
    copy_paste=0.15,         
    copy_paste_mode="flip",
    erasing=0.1,             
    auto_augment="",         

    cache="disk",            
    deterministic=True,
    seed=42,
    plots=True,
    save=True,
    save_period=25,
    workers=4,
)

from pathlib import Path

train_dir = Path(str(results.save_dir))
print(f"\n📁 Výsledky: {train_dir}")

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
