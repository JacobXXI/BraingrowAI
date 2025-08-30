"""
Tag catalog for videos.

VIDEO_TAG_CATALOG maps a high-level board (e.g., 'math', 'science', 'english')
to a dictionary of topics (e.g., 'algebra', 'ai', 'grammar'), each with a list
of related keyword tags to help search, classification, and recommendations.

Use cases:
- Seeding dropdowns in UI
- Validating/normalizing tags on ingest
- Guiding recommendations toward preferred boards/topics
"""

from typing import Dict, List

# Board -> Topic -> List[str] (keywords)
VIDEO_TAG_CATALOG: Dict[str, Dict[str, List[str]]] = {
    "math": {
        "algebra": [
            "equations", "inequalities", "polynomials", "factorization",
            "linear", "quadratic", "systems of equations",
        ],
        "geometry": [
            "triangles", "circles", "angles", "area", "volume",
            "proofs", "euclidean", "similarity", "congruence",
        ],
        "trigonometry": [
            "sine", "cosine", "tangent", "identities", "unit circle",
            "radians", "triangles",
        ],
        "calculus": [
            "limits", "derivatives", "integrals", "series",
            "differential equations", "optimization",
        ],
        "statistics": [
            "probability", "distributions", "hypothesis testing",
            "regression", "bayes", "data analysis",
        ],
        "number theory": [
            "primes", "modular arithmetic", "gcd", "diophantine",
        ],
    },
    "science": {
        "physics": [
            "mechanics", "kinematics", "dynamics", "thermodynamics",
            "electricity", "magnetism", "optics", "quantum",
        ],
        "chemistry": [
            "atoms", "molecules", "reactions", "stoichiometry",
            "periodic table", "organic", "inorganic",
        ],
        "biology": [
            "cells", "genetics", "evolution", "anatomy", "physiology",
            "ecology", "microbiology",
        ],
        "computer science": [
            "algorithms", "data structures", "complexity", "networks",
            "operating systems", "databases",
        ],
        "ai": [
            "machine learning", "neural networks", "deep learning",
            "nlp", "computer vision", "reinforcement learning",
            "transformers",
        ],
        "astronomy": [
            "planets", "stars", "galaxies", "cosmology", "telescopes",
        ],
        "earth science": [
            "geology", "meteorology", "oceanography", "climate",
        ],
    },
    "english": {
        "grammar": [
            "parts of speech", "tenses", "punctuation", "clauses",
            "prepositions", "articles", "subject-verb agreement",
        ],
        "vocabulary": [
            "synonyms", "antonyms", "idioms", "phrasal verbs",
            "collocations",
        ],
        "writing": [
            "essays", "argumentative", "narrative", "descriptive",
            "thesis", "outline", "editing", "style",
        ],
        "literature": [
            "poetry", "drama", "novels", "short stories",
            "literary devices", "analysis",
        ],
        "pronunciation": [
            "phonetics", "stress", "intonation", "accent",
        ],
        "reading comprehension": [
            "skimming", "scanning", "inference", "main idea",
        ],
    },
    # Extended categories often requested on home feeds
    "sports": {
        "football": [
            "tactics", "training", "highlights", "premier league",
            "world cup", "skills",
        ],
        "basketball": [
            "nba", "drills", "shooting", "defense", "highlights",
        ],
        "tennis": [
            "forehand", "backhand", "serve", "strategy", "grand slam",
        ],
        "fitness": [
            "workout", "cardio", "strength", "yoga", "pilates",
        ],
    },
    "arts": {
        "dance": [
            "ballet", "hip hop", "contemporary", "salsa", "k-pop",
        ],
        "music": [
            "theory", "guitar", "piano", "singing", "production",
        ],
        "painting": [
            "watercolor", "acrylic", "oil", "drawing", "perspective",
        ],
    },
    "technology": {
        "programming": [
            "python", "javascript", "java", "c++", "web", "backend",
            "frontend", "api", "testing",
        ],
        "data science": [
            "pandas", "numpy", "matplotlib", "statistics", "ml",
        ],
        "cloud": [
            "aws", "gcp", "azure", "docker", "kubernetes", "terraform",
        ],
        "cybersecurity": [
            "network", "encryption", "pentesting", "malware", "security",
        ],
    },
    "business": {
        "finance": [
            "investing", "stocks", "options", "budgeting", "valuation",
        ],
        "marketing": [
            "seo", "content", "social media", "brand", "ads",
        ],
        "entrepreneurship": [
            "startup", "mvp", "fundraising", "product", "growth",
        ],
    },
    "life": {
        "health": [
            "nutrition", "sleep", "mental health", "meditation",
            "mindfulness",
        ],
        "productivity": [
            "time management", "focus", "habits", "study techniques",
        ],
    },
}

__all__ = ["VIDEO_TAG_CATALOG"]

