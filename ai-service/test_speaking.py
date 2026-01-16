#!/usr/bin/env python3
"""
Test script for speaking score functionality
"""

import json
import time

# Mock the log file path (we'll use a simple print instead since we can't write to the real path)
LOG_FILE = 'c:\\Users\\Burkay Çakar\\Desktop\\SoftwareProject\\.cursor\\debug.log'

def write_log(entry):
    """Write log entry to file"""
    try:
        with open(LOG_FILE, 'a', encoding='utf-8') as f:
            f.write(json.dumps(entry, ensure_ascii=False) + '\n')
        print(f"LOG: {entry['message']}")
    except Exception as e:
        print(f"Failed to write log: {e}")
        print(f"LOG: {entry['message']}")

def calculate_speaking_score(text: str, frontend_score: int = None) -> int:
    """Calculate speaking score based on frontend transcription analysis."""
    import json
    import time

    # Hypothesis D: AI service speaking score calculation entry
    log_entry = {
        "id": f"log_{int(time.time()*1000)}_ai_entry",
        "timestamp": int(time.time()*1000),
        "location": "ai-service/main.py:104",
        "message": "AI calculate_speaking_score called",
        "data": {"frontend_score": frontend_score, "text_length": len(text) if text else 0},
        "sessionId": "debug-session",
        "runId": "test",
        "hypothesisId": "D"
    }

    write_log(log_entry)

    # Use frontend score if provided (more accurate word-matching algorithm)
    if frontend_score is not None:
        final_score = min(100, frontend_score * 5)  # Convert 0-20 scale to 0-100

        # Hypothesis D: Frontend score used
        log_entry = {
            "id": f"log_{int(time.time()*1000)}_ai_frontend",
            "timestamp": int(time.time()*1000),
            "location": "ai-service/main.py:118",
            "message": "Frontend score used for speaking",
            "data": {"frontend_score": frontend_score, "final_score": final_score},
            "sessionId": "debug-session",
            "runId": "test",
            "hypothesisId": "D"
        }

        write_log(log_entry)

        return final_score

    # Fallback logic for when frontend score is not available
    if not text or len(text.strip()) == 0:
        # Hypothesis D: Fallback - empty text
        log_entry = {
            "id": f"log_{int(time.time()*1000)}_ai_empty",
            "timestamp": int(time.time()*1000),
            "location": "ai-service/main.py:136",
            "message": "Fallback - empty text",
            "data": {"return_score": 0},
            "sessionId": "debug-session",
            "runId": "test",
            "hypothesisId": "D"
        }

        write_log(log_entry)

        return 0

    # Basic validation: check if text contains recognizable English words
    words = text.lower().split()
    english_words = ['the', 'and', 'is', 'in', 'to', 'of', 'a', 'that', 'it', 'with', 'as', 'for', 'was', 'on', 'are', 'be', 'this', 'have', 'or', 'by']

    # Count recognized English words
    recognized_words = sum(1 for word in words if any(ew in word for ew in english_words) or len(word) > 3)

    # Calculate score based on word count and recognition
    word_score = min(60, len(words) * 3)
    recognition_score = min(40, recognized_words * 4)
    final_score = min(100, word_score + recognition_score)

    # Hypothesis D: Fallback calculation complete
    log_entry = {
        "id": f"log_{int(time.time()*1000)}_ai_fallback",
        "timestamp": int(time.time()*1000),
        "location": "ai-service/main.py:165",
        "message": "Fallback speaking score calculated",
        "data": {"word_score": word_score, "recognition_score": recognition_score, "final_score": final_score},
        "sessionId": "debug-session",
        "runId": "test",
        "hypothesisId": "D"
    }

    write_log(log_entry)

    return final_score

def test_speaking_scores():
    """Test various speaking score scenarios"""
    print("🧪 Testing Speaking Score Logic")
    print("=" * 50)

    test_cases = [
        {
            "name": "Perfect match (frontend score provided)",
            "text": "Technology connects us and makes communication easier",
            "frontend_score": 20,
            "expected_range": (90, 100)
        },
        {
            "name": "Good match (frontend score provided)",
            "text": "Books are our best friends and provide knowledge",
            "frontend_score": 16,
            "expected_range": (70, 90)
        },
        {
            "name": "Poor match (frontend score provided)",
            "text": "Some random text here",
            "frontend_score": 5,
            "expected_range": (20, 40)
        },
        {
            "name": "No frontend score (fallback logic)",
            "text": "Technology connects us and makes communication easier",
            "frontend_score": None,
            "expected_range": (30, 60)
        },
        {
            "name": "Empty text (fallback)",
            "text": "",
            "frontend_score": None,
            "expected_range": (0, 0)
        }
    ]

    for i, test_case in enumerate(test_cases, 1):
        print(f"\n📋 Test {i}: {test_case['name']}")
        print(f"Input: frontend_score={test_case['frontend_score']}, text='{test_case['text'][:50]}...'")

        score = calculate_speaking_score(test_case['text'], test_case['frontend_score'])

        expected_min, expected_max = test_case['expected_range']
        is_correct = expected_min <= score <= expected_max

        status = "✅ PASS" if is_correct else "❌ FAIL"
        print(f"Result: {score} (expected: {expected_min}-{expected_max}) {status}")

if __name__ == "__main__":
    test_speaking_scores()
