from yt_dlp import YoutubeDL
import os
import vertexai
from vertexai.preview.generative_models import GenerativeModel, Part
from os import path

ydl_opts = {
    'format': 'best',
    'noplaylist': True  # if you only want a single video
}

def extract_yt_url(url):
    with YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=False)
        return info.get('url', None)

def _init_vertex_ai(project_id: str | None = None, location: str = "us-central1"):
    project_id = "braingrowai"
    location = os.getenv("australia-southeast2", location)
    vertexai.init(project=project_id, location=location)


def ask_AI(url, question, start_timestamp=None, end_timestamp=None):
    _init_vertex_ai()
    model = GenerativeModel("gemini-2.5-flash")
    response = model.generate_content([
        Part.from_uri(file_uri=url, mime_type=path.splitext(url)[1]),
        generate_prompt(question, start_timestamp, end_timestamp),
    ])
    return response.text


def recognize_video(url):
    """Use Vertex AI to describe objects and actions in a video."""
    _init_vertex_ai()
    model = GenerativeModel("gemini-2.5-flash")
    response = model.generate_content([
        Part.from_uri(file_uri=url, mime_type=path.splitext(url)[1]),
        "Describe the main objects and actions in this video.",
    ])
    return response.text

def generate_prompt(question, start_timestamp, end_timestamp):
    if start_timestamp and end_timestamp:
        prompt = f"Watch the video from {start_timestamp} to {end_timestamp} and answer the question: {question}"
    elif start_timestamp:
        prompt = f"Watch the frame on {start_timestamp} and answer the question: {question}"
    else:
        prompt = f"Answer the question about the video: {question}"
    return prompt
