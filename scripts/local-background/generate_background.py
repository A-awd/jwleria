# Free local background generator (owner direction 2026-11-01): one product-free studio background, seeded and
# reproducible, on this Mac. BACKGROUND ONLY: no product is generated, redrawn, retouched, upscaled or recoloured;
# products are placed afterwards, unchanged, by scripts/catalog-intake/background-composite.mjs.
# Model: stable-diffusion-v1-5 (CreativeML OpenRAIL-M; use restrictions apply), pinned revision, fp16 UNet, text
# encoder and VAE only (no safety checker, no other variants), Apple MPS, 512x512. No paid API, no upload of any file.
# Usage (inside an isolated venv outside the repository; see README.md):
#   python generate_background.py --out-dir /private/dir --cache-dir /private/hf-home [--seed N] [--prompt TEXT]
import argparse, hashlib, json, os, resource, subprocess, time
ap = argparse.ArgumentParser()
ap.add_argument("--out-dir", required=True); ap.add_argument("--cache-dir", required=True)
ap.add_argument("--seed", type=int, default=20261101); ap.add_argument("--steps", type=int, default=25)
ap.add_argument("--guidance", type=float, default=6.5); ap.add_argument("--prompt"); ap.add_argument("--negative")
args = ap.parse_args()
os.environ["HF_HOME"] = os.path.abspath(args.cache_dir)
os.environ.setdefault("HF_HUB_DISABLE_TELEMETRY", "1")
import torch
from huggingface_hub import snapshot_download
from diffusers import StableDiffusionPipeline, DPMSolverMultistepScheduler
import diffusers, transformers

REPO, REV = "stable-diffusion-v1-5/stable-diffusion-v1-5", "451f4fe16113bff5a5d2269ed5ad43b0592e9a14"
SEED = args.seed
PROMPT = args.prompt or (
    "empty minimalist luxury photography studio backdrop, seamless warm light grey and soft cream paper sweep, "
    "smooth pale stone surface, soft diffused daylight, gentle gradient, large empty centre, clean high-end product "
    "photography background, nothing on it")
NEGATIVE = args.negative or ("product, bag, handbag, watch, jewellery, object, vase, furniture, person, people, hand, text, letters, "
            "logo, watermark, signature, frame, clutter, dark, harsh shadow, saturated colours")
OUT = os.path.abspath(args.out_dir)
os.makedirs(OUT, exist_ok=True)

def swap():
    return subprocess.run(["sysctl", "-n", "vm.swapusage"], capture_output=True, text=True).stdout.strip()

t0 = time.time()
path = snapshot_download(REPO, revision=REV, allow_patterns=[
    "model_index.json", "scheduler/*", "tokenizer/*", "feature_extractor/*",
    "text_encoder/config.json", "text_encoder/model.fp16.safetensors",
    "unet/config.json", "unet/diffusion_pytorch_model.fp16.safetensors",
    "vae/config.json", "vae/diffusion_pytorch_model.fp16.safetensors"])
t_download = time.time() - t0
swap_before = swap()
pipe = StableDiffusionPipeline.from_pretrained(path, torch_dtype=torch.float16, variant="fp16",
                                               safety_checker=None, requires_safety_checker=False)
pipe.scheduler = DPMSolverMultistepScheduler.from_config(pipe.scheduler.config)
pipe = pipe.to("mps")
pipe.enable_attention_slicing()
gen = torch.Generator("cpu").manual_seed(SEED)
t1 = time.time()
image = pipe(PROMPT, negative_prompt=NEGATIVE, num_inference_steps=args.steps, guidance_scale=args.guidance,
             height=512, width=512, generator=gen).images[0]
t_generate = time.time() - t1
name = f"background-sd15-seed{SEED}.png"
image.save(os.path.join(OUT, name))
data = open(os.path.join(OUT, name), "rb").read()
record = {"file": name, "sha256": hashlib.sha256(data).hexdigest(), "bytes": len(data), "width": 512, "height": 512,
          "model": REPO, "revision": REV, "license": "CreativeML OpenRAIL-M", "precision": "fp16", "device": "mps",
          "scheduler": "DPMSolverMultistep", "steps": args.steps, "guidance": args.guidance, "seed": SEED, "prompt": PROMPT, "negative": NEGATIVE,
          "seconds_download_or_cache": round(t_download, 1), "seconds_generate": round(t_generate, 1),
          "peak_rss_mib": round(resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / 1048576, 1),
          "swap_before": swap_before, "swap_after": swap(),
          "versions": {"torch": torch.__version__, "diffusers": diffusers.__version__, "transformers": transformers.__version__}}
json.dump(record, open(os.path.join(OUT, name + ".json"), "w"), indent=1)
print(json.dumps(record))
