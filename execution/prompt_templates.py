#!/usr/bin/env python3
"""
Editorial Prompt Templates
Segment-specific role definitions and quality examples for delightful insights
"""

SEGMENT_PERSONAS = {
    'builders': {
        'role': 'software engineers and technical builders',
        'care_about': 'implementation details, performance, developer experience, tooling decisions',
        'good_examples': [
            'First Rust-based framework to match Go performance - could shift backend language choices',
            'Breaking change in React 19 requires migration in 80% of large codebases',
            'New debugging technique cuts production issue resolution from hours to minutes'
        ]
    },
    'leaders': {
        'role': 'CTOs, engineering directors, and technical decision-makers',
        'care_about': 'strategic implications, team impact, cost/benefit, competitive positioning',
        'good_examples': [
            'Forces reevaluation of build-vs-buy AI strategies as vendor models now exceed in-house capabilities',
            'First major security breach tied to AI code assistants - likely to trigger enterprise policy changes',
            'Acquisition signals consolidation in observability space, potentially raising vendor lock-in risks'
        ]
    },
    'innovators': {
        'role': 'researchers, AI practitioners, and technology innovators',
        'care_about': 'breakthrough discoveries, architectural shifts, research implications, frontier capabilities',
        'good_examples': [
            'First evidence that sparse models can match dense transformers at 10x lower inference cost',
            'Challenges fundamental assumptions about attention mechanisms in language models',
            'Opens path to AGI benchmarks previously thought impossible for current architectures'
        ]
    }
}


def get_editorial_guidance(segment: str) -> str:
    """Get segment-specific editorial guidance for 'why this matters'"""
    
    persona = SEGMENT_PERSONAS.get(segment, SEGMENT_PERSONAS['builders'])
    
    # Format examples
    examples_text = '\n'.join(f"  - {ex}" for ex in persona['good_examples'])
    
    return f"""
**EDITORIAL EXCELLENCE FOR "WHY THIS MATTERS":**

Your audience is {persona['role']}.
They care about: {persona['care_about']}

✅ **GOOD EXAMPLES:**
{examples_text}

❌ **AVOID:**
- Generic hype: "This is a game-changer" / "Revolutionary development"
- Obvious statements: "AI is transforming tech" / "Shows continued innovation"
- Restating the headline: "Company X launches new product"
- Vague hand-waving: "Important for the industry" / "Worth keeping an eye on"

✅ **INSTEAD, BE SPECIFIC:**
- What decision might this change?
- What assumption does this challenge?
- What constraint does this remove?
- What new risk/opportunity does this create?
- What precedent does this set?

**TONE:** Confident but not breathless. Insightful but not pretentious. Like a trusted colleague who's 3 steps ahead.
"""


def get_segment_role_description(segment: str) -> str:
    """Get segment-specific role description for the LLM"""
    
    persona = SEGMENT_PERSONAS.get(segment, SEGMENT_PERSONAS['builders'])
    
    return f"You are an expert tech editor writing for {persona['role']}."


def get_segment_context(segment: str) -> str:
    """Get what the segment cares about"""
    
    persona = SEGMENT_PERSONAS.get(segment, SEGMENT_PERSONAS['builders'])
    
    return persona['care_about']
