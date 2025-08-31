import google.generativeai as genai
from google.generativeai import types


import time
class VertexAICredentialsError(RuntimeError):
    """Raised when Google credentials are missing."""

def ask_AI(video_url, question, history=None):
  start_time = time.perf_counter()
  print(f"[+{time.perf_counter() - start_time:.3f}s] Asking AI...")
  client = genai.Client(
    vertexai=True,
    project="braingrowai",
    location="global",
  )
  video = types.Part.from_uri(
      file_uri=video_url,
      mime_type="video/mp4"
  )
  # Build conversational context leveraging prior turns. We include the
  # video reference once and then replay the conversation history.
  print(f"[+{time.perf_counter() - start_time:.3f}s] Client created")
  model = "gemini-2.5-flash-lite"
  contents = []
  # Include the video only on the first turn (no history yet)
  if not history:
    print("First ask, including video in context:", video_url)
    contents.append(
      types.Content(
        role="user",
        parts=[
          video,
          types.Part.from_text(
            text=(
              "You will answer questions about this video. "
              "Use only the video content to inform your answers. "
              "Be concise and continue the conversation naturally."
            )
          )
        ]
      )
    )

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

  # Append current user question
  contents.append(
    types.Content(
      role="user",
      parts=[types.Part.from_text(text=question)]
    )
  )
  generate_content_config = types.GenerateContentConfig(
    temperature = 1,
    top_p = 0.95,
    # Reduce the number of tokens the model may generate to speed up responses
    max_output_tokens = 512,
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
  print(f"[+{time.perf_counter() - start_time:.3f}s] config created")
  response_text = ""
  for chunk in client.models.generate_content_stream(
    model = model,
    contents = contents,
    config = generate_content_config,
    ):
    response_text += chunk.text or ""
  print(f"[+{time.perf_counter() - start_time:.3f}s] Got response from AI.")
  return response_text

