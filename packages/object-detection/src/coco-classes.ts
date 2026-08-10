/**
 * COCO 80-class names (index = YOLOv8 class ID). Lower-cased for lookup.
 */

export const COCO_CLASSES = [
  "person", "bicycle", "car", "motorcycle", "airplane", "bus", "train", "truck",
  "boat", "traffic light", "fire hydrant", "stop sign", "parking meter", "bench",
  "bird", "cat", "dog", "horse", "sheep", "cow", "elephant", "bear", "zebra",
  "giraffe", "backpack", "umbrella", "handbag", "tie", "suitcase", "frisbee",
  "skis", "snowboard", "sports ball", "kite", "baseball bat", "baseball glove",
  "skateboard", "surfboard", "tennis racket", "bottle", "wine glass", "cup",
  "fork", "knife", "spoon", "bowl", "banana", "apple", "sandwich", "orange",
  "broccoli", "carrot", "hot dog", "pizza", "donut", "cake", "chair", "couch",
  "potted plant", "bed", "dining table", "toilet", "tv", "laptop", "mouse",
  "remote", "keyboard", "cell phone", "microwave", "oven", "toaster", "sink",
  "refrigerator", "book", "clock", "vase", "scissors", "teddy bear", "hair drier",
  "toothbrush",
] as const;

const ALIASES: Record<string, string> = {
  phone: "cell phone",
  cellphone: "cell phone",
  mobile: "cell phone",
  smartphone: "cell phone",
  tv: "tv",
  television: "tv",
  monitor: "tv",
  sofa: "couch",
  plant: "potted plant",
  bike: "bicycle",
};

export function resolveCocoClassId(name: string): number | null {
  const key = name.trim().toLowerCase();
  const canonical = ALIASES[key] ?? key;
  const idx = COCO_CLASSES.indexOf(canonical as (typeof COCO_CLASSES)[number]);
  return idx >= 0 ? idx : null;
}
