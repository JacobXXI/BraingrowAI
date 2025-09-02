from google import genai
from google.genai import types
from google.auth.exceptions import DefaultCredentialsError
try:
  # google-api-core may not always be installed, so guard import
  from google.api_core.exceptions import PermissionDenied, Unauthenticated
except Exception:  # pragma: no cover - optional import
  PermissionDenied = type("PermissionDenied", (), {})
  Unauthenticated = type("Unauthenticated", (), {})

import os
import re
import time
import mimetypes

class VertexAICredentialsError(RuntimeError):
    """Raised when Google credentials are missing or lack permissions."""

class TranscriptUnavailableError(RuntimeError):
    """Raised when a YouTube transcript is unavailable for the video."""

def ask_AI(video_url, question, history=None):
  start_time = time.perf_counter()
  print(f"[+{time.perf_counter() - start_time:.3f}s] Asking AI...")

  client = genai.Client(
      vertexai=True,
      project=os.getenv("GOOGLE_CLOUD_PROJECT", "braingrowai"),
      location="global",
  )
    
  video1 = types.Part.from_uri(
      file_uri=video_url,
      mime_type="video/*",
  )
  
  print(f"[+{time.perf_counter() - start_time:.3f}s] Client created")
  model = "gemini-2.5-flash-lite"
  contents = []

  # Replay history
  for turn in (history or []):
    try:
      role = turn.get("role", "user")
      text = turn.get("text", "")
    except AttributeError:
      continue
    if not text:
      continue
    role_norm = "user" if role not in ("user", "model") else role
    contents.append(
      types.Content(
        role=role_norm,
        parts=[types.Part.from_text(text=text)]
      )
    )

  if not history:
    contents.append(
      types.Content(
        role="user",
        parts=[video1,
               types.Part.from_text(text=(
                 "You are an AI assistant that helps people learn and understand educational videos. "
                 "You will be provided with a video, and then a question about the video. "
                 "Answer the question as best you can based on the content of the video. "
               ))]
      )
    )
    print("First ask")
  contents.append(
    types.Content(
      role="user",
      parts=[types.Part.from_text(text=question)]
    )
  )

  generate_content_config = types.GenerateContentConfig(
    temperature = 1,
    top_p = 0.95,
    max_output_tokens = 65535,
    safety_settings = [types.SafetySetting(
      category="HARM_CATEGORY_HATE_SPEECH",
      threshold="OFF"
    ),types.SafetySetting(
      category="HARM_CATEGORY_DANGEROUS_CONTENT",
      threshold="OFF"
    ),types.SafetySetting(
      category="HARM_CATEGORY_SEXUALLY_EXPLICIT",
      threshold="OFF"
    ),types.SafetySetting(
      category="HARM_CATEGORY_HARASSMENT",
      threshold="OFF"
    )],
    thinking_config=types.ThinkingConfig(
      thinking_budget=0,
    ),
  )
  response_text = ""
  print(f"[+{time.perf_counter() - start_time:.3f}s] config created")
  for chunk in client.models.generate_content_stream(
      model = model,
      contents = contents,
      config = generate_content_config,
      ):
      response_text += chunk.text or ""
  return response_text