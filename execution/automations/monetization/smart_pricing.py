#!/usr/bin/env python3
"""
Smart Pricing Calculator
Dynamically calculates sponsorship pricing based on:
- Reach (subscriber count in segment)
- Engagement (click rate on similar content)
- Proof (actual clicks on related article)
- Competition benchmarking
"""

import os
import sys
from pathlib import Path
from typing import Dict, Optional
from dataclasses import dataclass

# Add parent directories to path
sys.path.append(str(Path(__file__).parent.parent.parent))


@dataclass
class PricingInputs:
    """Inputs for pricing calculation"""
    subscribers: int  # Total subscribers in matched segment
    article_clicks: int  # Clicks on the matched article
    segment_click_rate: float  # Average click rate for segment (%)
    competitor_name: Optional[str] = None  # Name of competitor mentioned
    

@dataclass
class PricingResult:
    """Result of pricing calculation"""
    base_price: int
    final_price: int
    reach_score: float
    engagement_score: float
    proof_score: float
    tier: str
    min_guaranteed_clicks: int
    reasoning: str


class SmartPricingCalculator:
    """Calculate smart, dynamic sponsorship pricing"""
    
    # Competitive benchmarks (for context)
    BENCHMARKS = {
        "tldr": {"subs": 300000, "price": 2500},
        "indie_hackers": {"subs": 50000, "price": 1500},
        "cooper_press": {"subs": 30000, "price": 600}
    }
    
    # Pricing tiers (in cents)
    TIERS = {
        "starter": 50000,      # $500
        "standard": 75000,     # $750
        "premium": 120000,     # $1,200
        "enterprise": 200000   # $2,000
    }
    
    def __init__(self):
        self.base_price = 500  # Starting point in dollars
    
    def calculate(self, inputs: PricingInputs) -> PricingResult:
        """Calculate final price based on inputs"""
        
        # Calculate individual scores
        reach_score = self._calculate_reach_score(inputs.subscribers)
        engagement_score = self._calculate_engagement_score(inputs.segment_click_rate)
        proof_score = self._calculate_proof_score(inputs.article_clicks)
        
        # Calculate raw price
        raw_price = self.base_price * reach_score * engagement_score * proof_score
        
        # Apply tiering
        tier, final_price = self._apply_tier(raw_price)
        
        # Calculate guaranteed clicks
        min_clicks = max(10, int(inputs.subscribers * inputs.segment_click_rate / 100 * 0.7))
        
        # Generate reasoning
        reasoning = self._generate_reasoning(
            inputs, reach_score, engagement_score, proof_score, tier
        )
        
        return PricingResult(
            base_price=self.base_price,
            final_price=final_price,
            reach_score=reach_score,
            engagement_score=engagement_score,
            proof_score=proof_score,
            tier=tier,
            min_guaranteed_clicks=min_clicks,
            reasoning=reasoning
        )
    
    def _calculate_reach_score(self, subscribers: int) -> float:
        """Calculate reach multiplier (0.5x - 3x)"""
        if subscribers <= 25:
            return 0.5  # Small audience, lower price
        elif subscribers <= 50:
            return 1.0  # Base case
        elif subscribers <= 100:
            return 1.5
        elif subscribers <= 200:
            return 2.0
        else:
            return min(3.0, 2.0 + (subscribers - 200) / 200)  # Cap at 3x
    
    def _calculate_engagement_score(self, click_rate: float) -> float:
        """Calculate engagement multiplier (0.7x - 2x)"""
        # 5% click rate is baseline (1x)
        # 10% click rate is excellent (2x)
        if click_rate < 3:
            return 0.7  # Low engagement
        elif click_rate < 5:
            return 0.9
        elif click_rate < 7:
            return 1.1
        elif click_rate < 10:
            return 1.5
        else:
            return min(2.0, 1.5 + (click_rate - 10) / 10)  # Cap at 2x
    
    def _calculate_proof_score(self, article_clicks: int) -> float:
        """Calculate proof multiplier (0.8x - 2x)"""
        # 10 clicks is baseline (1x)
        # 20+ clicks is excellent (2x)
        if article_clicks < 5:
            return 0.8
        elif article_clicks < 10:
            return 0.9
        elif article_clicks < 15:
            return 1.1
        elif article_clicks < 20:
            return 1.5
        else:
            return min(2.0, 1.5 + (article_clicks - 20) / 20)  # Cap at 2x
    
    def _apply_tier(self, raw_price: float) -> tuple[str, int]:
        """Apply tier rounding to raw price"""
        if raw_price < 600:
            return "starter", self.TIERS["starter"]
        elif raw_price < 900:
            return "standard", self.TIERS["standard"]
        elif raw_price < 1500:
            return "premium", self.TIERS["premium"]
        else:
            return "enterprise", self.TIERS["enterprise"]
    
    def _generate_reasoning(
        self,
        inputs: PricingInputs,
        reach: float,
        engagement: float,
        proof: float,
        tier: str
    ) -> str:
        """Generate human-readable pricing reasoning"""
        reasons = []
        
        # Reach reasoning
        if reach >= 2.0:
            reasons.append(f"Large audience ({inputs.subscribers} subs) → High reach")
        elif reach <= 0.7:
            reasons.append(f"Smaller audience ({inputs.subscribers} subs) → Lower reach")
        
        # Engagement reasoning
        if engagement >= 1.5:
            reasons.append(f"Excellent engagement ({inputs.segment_click_rate}% CTR)")
        elif engagement <= 0.8:
            reasons.append(f"Lower engagement ({inputs.segment_click_rate}% CTR)")
        
        # Proof reasoning
        if proof >= 1.5:
            reasons.append(f"Strong proof ({inputs.article_clicks} clicks on related content)")
        elif proof <= 0.9:
            reasons.append(f"Limited proof ({inputs.article_clicks} clicks)")
        
        # Competitor boost
        if inputs.competitor_name:
            reasons.append(f"Competitive angle vs {inputs.competitor_name}")
        
        return " | ".join(reasons) if reasons else f"Standard pricing for {tier} tier"
    
    def get_price_display(self, price_cents: int) -> str:
        """Convert cents to display price"""
        return f"${price_cents // 100:,}"


# Example usage
if __name__ == "__main__":
    calculator = SmartPricingCalculator()
    
    # Example 1: Small engaged audience
    result1 = calculator.calculate(PricingInputs(
        subscribers=45,
        article_clicks=18,
        segment_click_rate=8.5,
        competitor_name="Docker"
    ))
    
    print("Example 1: Small Engaged Audience")
    print(f"Price: {calculator.get_price_display(result1.final_price)}")
    print(f"Tier: {result1.tier}")
    print(f"Guaranteed clicks: {result1.min_guaranteed_clicks}+")
    print(f"Reasoning: {result1.reasoning}")
    print()
    
    # Example 2: Large audience, lower engagement
    result2 = calculator.calculate(PricingInputs(
        subscribers=150,
        article_clicks=12,
        segment_click_rate=4.2
    ))
    
    print("Example 2: Large Audience, Lower Engagement")
    print(f"Price: {calculator.get_price_display(result2.final_price)}")
    print(f"Tier: {result2.tier}")
    print(f"Guaranteed clicks: {result2.min_guaranteed_clicks}+")
    print(f"Reasoning: {result2.reasoning}")
