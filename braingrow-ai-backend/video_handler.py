import google.generativeai as genai
from google.generativeai import types

class VertexAICredentialsError(RuntimeError):
    """Raised when Google credentials are missing."""

def ask_AI(video_url, question, start = -1, end = -1):
  client = genai.Client(
    vertexai=True,
    project="braingrowai",
    location="global",
  )
  video = types.Part.from_uri(
      file_uri=video_url,
      mime_type="video/mp4"
  )
  if start == -1 and end == -1:
    prompt = types.Part.from_text(text=f"""Watch the provided video. Then, answer the following question based on the video content: {question}""")
  elif start != -1 and end == -1:
    prompt = types.Part.from_text(text=f"""Watch the provided video at {start}. Then, answer the following question based on the video content: {question}""")
  else:
    prompt = types.Part.from_text(text=f"""Watch the provided video from {start} to {end}. Then, answer the following question based on the video content: {question}""")
  
  model = "gemini-2.5-flash-lite"
  contents = [
    types.Content(
      role="user",
      parts=[
        video,
        prompt
      ]
    )
  ]
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
  for chunk in client.models.generate_content_stream(
    model = model,
    contents = contents,
    config = generate_content_config,
    ):
    response_text += chunk.text or ""
  return response_text