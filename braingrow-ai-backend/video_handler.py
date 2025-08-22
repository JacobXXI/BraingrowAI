from yt_dlp import YoutubeDL
from google import genai
from google.genai.types import HttpOptions, Part
from os import path

ydl_opts = {
    'format': 'best',
    'noplaylist': True  # if you only want a single video
}

def extract_yt_url(url):
    with YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=False)
        return info.get('url', None)

def ask_AI(url, question, start_timestamp = None, end_timestamp = None):
    client = genai.Client(http_options=HttpOptions(api_version="v1"))
    response = client.models.generate_content(
    model="gemini-2.5-flash",
    contents=[
        Part.from_uri(
            file_uri=url,
            mime_type=path.splitext(url)[1],
        ),
        generate_prompt(question, start_timestamp, end_timestamp),
    ],)
    return response.text

def generate_prompt(question, start_timestamp, end_timestamp):
    if start_timestamp and end_timestamp:
        prompt = f"Watch the video from {start_timestamp} to {end_timestamp} and answer the question: {question}"
    elif start_timestamp:
        prompt = f"Watch the frame on {start_timestamp} and answer the question: {question}"
    else:
        prompt = f"Answer the question about the video: {question}"
    return prompt
