// Debug script: capture a frame from the camera and dump ALL YOLO detections
// across every COCO class above a very low confidence threshold.
import { loadConfig } from "/home/ubuntu/Projects/agenticros/packages/agenticros-claude-code/dist/config.js";
import { connect, disconnect, getTransport } from "/home/ubuntu/Projects/agenticros/packages/agenticros-claude-code/dist/transport.js";
import { resolveCameraSubscribeTopic } from "/home/ubuntu/Projects/agenticros/packages/core/dist/index.js";
import { ROS_MSG_COMPRESSED_IMAGE, cameraSnapshotFromPlainMessage } from "/home/ubuntu/Projects/agenticros/packages/ros-camera/dist/index.js";
import { PersonDetector } from "/home/ubuntu/Projects/agenticros/packages/agenticros-claude-code/dist/follow-me/detector.js";
import * as ort from "onnxruntime-node";
import sharp from "sharp";
import fs from "node:fs";

const COCO = [
  "person","bicycle","car","motorcycle","airplane","bus","train","truck",
  "boat","traffic light","fire hydrant","stop sign","parking meter","bench",
  "bird","cat","dog","horse","sheep","cow","elephant","bear","zebra",
  "giraffe","backpack","umbrella","handbag","tie","suitcase","frisbee",
  "skis","snowboard","sports ball","kite","baseball bat","baseball glove",
  "skateboard","surfboard","tennis racket","bottle","wine glass","cup",
  "fork","knife","spoon","bowl","banana","apple","sandwich","orange",
  "broccoli","carrot","hot dog","pizza","donut","cake","chair","couch",
  "potted plant","bed","dining table","toilet","tv","laptop","mouse",
  "remote","keyboard","cell phone","microwave","oven","toaster","sink",
  "refrigerator","book","clock","vase","scissors","teddy bear","hair drier",
  "toothbrush",
];

async function captureFrame(transport, topic) {
  return new Promise((resolve, reject) => {
    const sub = transport.subscribe(
      { topic, type: ROS_MSG_COMPRESSED_IMAGE },
      (msg) => {
        clearTimeout(timer);
        sub.unsubscribe();
        try {
          const payload = cameraSnapshotFromPlainMessage("CompressedImage", msg);
          resolve(Buffer.from(payload.dataBase64, "base64"));
        } catch (e) { reject(e); }
      },
    );
    const timer = setTimeout(() => { sub.unsubscribe(); reject(new Error("timeout")); }, 5000);
  });
}

const INPUT_SIZE = 640;

async function detectAll(image, modelPath) {
  const session = await ort.InferenceSession.create(modelPath, { executionProviders: ["cpu"], graphOptimizationLevel: "all" });
  const meta = await sharp(image).metadata();
  const origW = meta.width, origH = meta.height;
  const scale = Math.min(INPUT_SIZE / origW, INPUT_SIZE / origH);
  const newW = Math.round(origW * scale), newH = Math.round(origH * scale);
  const padX = Math.floor((INPUT_SIZE - newW) / 2), padY = Math.floor((INPUT_SIZE - newH) / 2);
  const { data } = await sharp(image)
    .resize(newW, newH, { fit: "fill" })
    .extend({ top: padY, bottom: INPUT_SIZE - newH - padY, left: padX, right: INPUT_SIZE - newW - padX, background: { r:114,g:114,b:114 } })
    .removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const pixels = INPUT_SIZE * INPUT_SIZE;
  const input = new Float32Array(3 * pixels);
  for (let i = 0; i < pixels; i++) {
    input[i] = data[i*3] / 255;
    input[pixels + i] = data[i*3 + 1] / 255;
    input[2*pixels + i] = data[i*3 + 2] / 255;
  }
  const tensor = new ort.Tensor("float32", input, [1, 3, INPUT_SIZE, INPUT_SIZE]);
  const inputName = session.inputNames[0];
  const outputName = session.outputNames[0];
  const out = await session.run({ [inputName]: tensor });
  const result = out[outputName];
  const [, _features, nAnchors] = result.dims;
  const arr = result.data;
  // For each anchor, find best class
  const perClassMax = new Array(80).fill(0);
  let overallMax = { score: 0, classId: -1, anchor: -1 };
  for (let i = 0; i < nAnchors; i++) {
    for (let c = 0; c < 80; c++) {
      const s = arr[(4 + c) * nAnchors + i];
      if (s > perClassMax[c]) perClassMax[c] = s;
      if (s > overallMax.score) overallMax = { score: s, classId: c, anchor: i };
    }
  }
  await session.release();
  return { perClassMax, overallMax, imageW: origW, imageH: origH };
}

(async () => {
  const config = loadConfig();
  console.error("connecting transport...");
  await connect(config);
  const transport = getTransport();
  const topic = resolveCameraSubscribeTopic(config, (config.robot?.cameraTopic ?? "").trim() || "/camera/camera/color/image_raw/compressed");
  console.error(`subscribing topic=${topic}`);
  const buf = await captureFrame(transport, topic);
  fs.writeFileSync("/tmp/yolo-frame.jpg", buf);
  console.error(`got frame ${buf.length} bytes, saved /tmp/yolo-frame.jpg`);
  const modelPath = process.env.AGENTICROS_YOLOV8_MODEL || "/home/ubuntu/.agenticros/models/yolov8n.onnx";
  const { perClassMax, overallMax, imageW, imageH } = await detectAll(buf, modelPath);
  console.error(`image ${imageW}x${imageH}`);
  console.error(`overall best: class=${overallMax.classId} (${COCO[overallMax.classId]}) score=${overallMax.score.toFixed(3)}`);
  const ranked = perClassMax.map((s, c) => ({ s, c })).sort((a,b) => b.s - a.s).slice(0, 15);
  console.error("top 15 classes (max anchor score):");
  for (const { s, c } of ranked) {
    console.error(`  ${s.toFixed(3)}  ${c}  ${COCO[c]}`);
  }
  await disconnect();
  process.exit(0);
})().catch(e => { console.error("ERR", e); process.exit(1); });
