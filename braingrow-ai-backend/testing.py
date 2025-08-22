import os

filePath = "gs://cloud-samples-data/generative-ai/video/ad_copy_from_video.mp4"

s = os.path.splitext(filePath)

print(s)