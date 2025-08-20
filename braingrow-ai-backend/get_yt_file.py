from yt_dlp import YoutubeDL

ydl_opts = {
    'format': 'best',
    'noplaylist': True  # if you only want a single video
}

def extract_yt_url(url):
    with YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=False)
        return info.get('url', None)