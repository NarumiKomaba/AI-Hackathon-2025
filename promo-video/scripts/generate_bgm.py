import torch
from transformers import AutoProcessor, MusicgenForConditionalGeneration
import scipy.io.wavfile
import numpy as np
import os

def generate_music():
    print("Loading model...")
    # Switched back to medium (fp16) for cleaner sound than quantized large.
    model_id = "facebook/musicgen-medium"
    
    processor = AutoProcessor.from_pretrained(model_id)
    model = MusicgenForConditionalGeneration.from_pretrained(model_id, torch_dtype=torch.float16)
    
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"Using device: {device}")
    model = model.to(device)

    print("Generating music (Medium model, fp16)...")
    # Prompt focusing on MELODY and INSTRUMENTS to avoid "just low bass"
    inputs = processor(
        text=["Orchestral March, Trumpet lead melody, French Horns, Snare Drums, Heroic Fanfare, Classical style, Bright, Upbeat, Adventure, no ambient, clear melody"],
        padding=True,
        return_tensors="pt",
    ).to(device)

    # MusicGen generates ~50 tokens per second of audio
    # We need ~34 seconds. 35s * 50 = 1750 tokens.
    # We'll set a safe upper bound.
    audio_values = model.generate(**inputs, max_new_tokens=1750)

    sampling_rate = model.config.audio_encoder.sampling_rate
    audio_data = audio_values[0, 0].cpu().numpy().astype(np.float32)
    
    # Save as WAV
    output_path = "c:/hackathon/promo-video/public/audio/bgm.wav"
    print(f"Saving to {output_path}")
    
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    # Scale to int16 for compatibility if needed, but float32 is valid too.
    # Let's normalize max to 1.0 to prevent clipping then write as float32.
    max_val = np.max(np.abs(audio_data))
    if max_val > 0:
        audio_data = audio_data / max_val
    
    scipy.io.wavfile.write(output_path, sampling_rate, audio_data)
    print("Done! BGM generated successfully.")

if __name__ == "__main__":
    generate_music()
