import os
from dotenv import load_dotenv
import sys

sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))
from backend.llm_service import analyze_prompt_with_gemini

print(analyze_prompt_with_gemini("plan trips accordin to location with budjet"))
