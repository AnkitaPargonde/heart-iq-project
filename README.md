# Heart-IQ Digital Twin

Automated heart-sound screening prototype built around a FastAPI backend and a React + Three.js diagnostic dashboard.

## Structure

```text
backend/   FastAPI upload and analysis API
frontend/  React dashboard scaffold
```

## Backend capabilities

- Resamples uploaded WAV files to `2000Hz`
- Applies a `4th-order Butterworth` bandpass filter from `25Hz` to `400Hz`
- Peak-normalizes the signal before feature extraction
- Extracts `13 MFCC` values plus spectral and energy features
- Estimates `BPM` from the filtered envelope
- Uses a trained `RandomForest` model if `backend/models/heart_rf.joblib` exists
- Falls back to a deterministic heuristic classifier when the PhysioNet-trained model artifact is not yet present

## Run the frontend

```powershell
Set-Location frontend
npm install
npm run dev
```

## Run the backend

```powershell
Set-Location backend
python -m pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

The frontend expects the backend analyze endpoint at:

```text
http://127.0.0.1:8000/analyze
```

## Train the model

Place the PhysioNet/CinC 2016 WAV files under:

```text
backend/physionet_2016/
```

Then run:

```powershell
Set-Location backend
python train_model.py
```

This creates `backend/models/heart_rf.joblib`, which the API will load automatically.

## External confirmation on 10 non-PhysioNet WAV files

If you have a separate heart-sound WAV folder from another source, you can run a quick confirmation pass on up to 10 files:

```powershell
Set-Location backend
python confirm_external_wavs.py --dataset-dir 'C:\path\to\external\wav_folder' --limit 10
```

This keeps PhysioNet as the training source, while giving you a separate outside-folder check for presentation or guide review.

## Current status

- Backend `/analyze` now returns diagnosis, BPM, confidence, MFCC fingerprint, waveform samples, energy bands, and recommendation text.
- Frontend now uploads live `.wav` files, renders a BPM-driven 3D heart twin, displays waveform and MFCC charts, and exposes a defense-mode UI toggle.
- This is still a prototype screening workflow and not a validated medical device or clinical diagnostic system.
