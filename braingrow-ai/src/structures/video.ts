export interface video {
    _id: string;
    title: string;
    description: string;
    author: string;
    date: Date;
    category: string;
    views: number;
    url: string;
    coverUrl: string;
    // Optional metadata from backend
    tags?: string;
    board?: string | null;
    topic?: string | null;
}
