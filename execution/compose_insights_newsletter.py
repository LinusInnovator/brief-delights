#!/usr/bin/env python3
"""
Weekly Insights Newsletter Composition Script
Assembles Sunday weekly insights email from synthesized data.
"""

import json
import os
import sys
from datetime import datetime
from pathlib import Path
from jinja2 import Template

# Configuration
PROJECT_ROOT = Path(__file__).parent.parent
TMP_DIR = PROJECT_ROOT / ".tmp"
TEMPLATE_FILE = PROJECT_ROOT / "weekly_insights_template.html"
SEGMENTS_CONFIG_FILE = PROJECT_ROOT / "segments_config.json"
TODAY = datetime.now().strftime("%Y-%m-%d")

# Newsletter config
NEWSLETTER_NAME = "Brief"
WEBSITE_URL = "https://send.dreamvalidator.com"
UNSUBSCRIBE_URL = f"{WEBSITE_URL}/unsubscribe"

def log(message: str):
    """Log to console"""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp}] {message}")

def load_segments_config():
    """Load segment configurations"""
    with open(SEGMENTS_CONFIG_FILE, 'r') as f:
        return json.load(f)

def format_date() -> str:
    """Format today's date for newsletter"""
    return datetime.now().strftime("%B %d, %Y")

def load_synthesis(segment: str) -> dict:
    """Load weekly synthesis data"""
    synthesis_file = TMP_DIR / f"weekly_insights_{segment}_{TODAY}.json"
    
    if not synthesis_file.exists():
        raise FileNotFoundError(f"Synthesis not found: {synthesis_file}")
    
    with open(synthesis_file, 'r') as f:
        return json.load(f)

def load_template() -> Template:
    """Load Jinja2 template"""
    if not TEMPLATE_FILE.exists():
        # Use minimal fallback based on newsletter_template.html structure
        template_content = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ newsletter_name }} Weekly Insights - {{ date }}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8f9fa; margin: 0; padding: 0;">
    <div style="max-width: 680px; margin: 0 auto; background-color: #ffffff;">
        <!-- Header -->
        <div style="background: #ffffff; padding: 40px 40px 32px 40px; text-align: center; border-bottom: 1px solid #e8e8e8;">
            <div style="font-size: 52px; font-weight: 700; letter-spacing: -1.5px; margin: 0; line-height: 1; color: #000000;">{{ newsletter_name }}</div>
            <div style="font-size: 16px; font-weight: 400; color: #666666; margin: 4px 0 12px 0; letter-spacing: 2px;">delights</div>
            <p style="margin: 0 0 8px 0; font-size: 14px; color: #999;">Weekly Insights 📊 | {{ date }}</p>
            <p style="margin: 0; font-size: 12px; color: #aaa; font-family: 'Courier New', monospace;">{{ total_scanned }} scanned → {{ total_enriched }} analyzed → {{ total_selected }} selected this week</p>
        </div>

        <!-- Insights Content -->
        <div style="padding: 40px;">
            {{ insights_html | safe }}
        </div>

        <!-- Footer -->
        <div style="background: #f8f9fa; padding: 32px 40px; border-top: 1px solid #e8e8e8; text-align: center; color: #666;">
            <p style="margin: 0 0 16px 0; font-size: 14px;">
                <a href="{{ website_url }}" style="color: #666; text-decoration: none;">briefdelights.com</a> |
                <a href="{{ unsubscribe_url }}" style="color: #666; text-decoration: none;">Unsubscribe</a>
            </p>
            <p style="margin: 0; font-size: 13px; color: #999;">
                This is a weekly strategic insights newsletter.<br>
                To change frequency preferences, visit your account settings.
            </p>
        </div>
    </div>
</body>
</html>
        """
        return Template(template_content)
    
    with open(TEMPLATE_FILE, 'r') as f:
        return Template(f.read())

def format_insights_html(insights_markdown: str) -> str:
    """Convert markdown insights to HTML"""
    # Simple markdown -> HTML conversion
    html = insights_markdown
    
    # Headers
    html = html.replace('\n# ', '\n<h2 style="font-size: 24px; font-weight: 700; margin: 32px 0 16px 0; color: #000;">')
    html = html.replace('\n## ', '\n<h3 style="font-size: 20px; font-weight: 600; margin: 24px 0 12px 0; color: #000;">')
    html = html.replace('\n### ', '\n<h4 style="font-size: 18px; font-weight: 600; margin: 20px 0 10px 0; color: #333;">')
    
    # Close headers (naive but works for our case)
    html = html.replace('</h', '\n</h')
    for i in range(2, 5):
        html = html.replace(f'<h{i} ', f'<h{i} ').replace('\n<', f'</h{i}>\n<')
    
    # Paragraphs
    paragraphs = html.split('\n\n')
    formatted = []
    for para in paragraphs:
        if not para.strip():
            continue
        if para.startswith('<h') or para.startswith('•'):
            formatted.append(para)
        else:
            formatted.append(f'<p style="margin: 0 0 16px 0; line-height: 1.6; color: #333;">{para}</p>')
    
    html = '\n\n'.join(formatted)
    
    # Bold
    import re
    html = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', html)
    
    # Bullets
    html = html.replace('\n• ', '\n<li style="margin-bottom: 8px;">')
    html = html.replace('<li ', '<ul style="margin: 16px 0; padding-left: 24px;"><li ')
    html = html.replace('</li>\n\n', '</li></ul>\n\n')
    
    return html

def compose_insights_newsletter(synthesis: dict, segment_config: dict) -> str:
    """Compose the Sunday insights newsletter HTML"""
    log("=" * 60)
    log(f"Composing Weekly Insights for {segment_config['name']} {segment_config['emoji']}")
    log("=" * 60)
    
    # Format insights as HTML
    insights_html = format_insights_html(synthesis['insights'])
    
    # Calculate metrics
    total_articles = synthesis['analysis']['total_articles']
    
    # Load template
    template = load_template()
    
   # Render HTML
    html = template.render(
        newsletter_name=NEWSLETTER_NAME,
        segment_name=f"{segment_config['name']} {segment_config['emoji']}",
        date=format_date(),
        insights_html=insights_html,
        total_scanned="~8,000",
        total_enriched="~2,400",
        total_selected=total_articles,
        website_url=WEBSITE_URL,
        unsubscribe_url=UNSUBSCRIBE_URL
    )
    
    # Calculate size
    size_kb = len(html.encode('utf-8')) / 1024
    log(f"\n📏 Newsletter size: {size_kb:.2f} KB")
    
    if size_kb > 102:
        log("⚠️ Warning: Email exceeds 102KB (Gmail clipping threshold)")
    
    return html

def save_newsletter(html: str, output_file: Path):
    """Save newsletter HTML to file"""
    with open(output_file, 'w') as f:
        f.write(html)
    
    log(f"✅ Newsletter saved to {output_file}")

def main():
    """Main execution"""
    if len(sys.argv) < 2:
        log("Usage: python3 compose_insights_newsletter.py <segment>")
        sys.exit(1)
    
    segment = sys.argv[1]
    output_file = TMP_DIR / f"newsletter_weekly_{segment}_{TODAY}.html"
    
    start_time = datetime.now()
    
    try:
        # Load synthesis
        log(f"\n📊 Loading synthesis for {segment}...")
        synthesis = load_synthesis(segment)
        
        # Load segment config
        segments_data = load_segments_config()
        if segment not in segments_data['segments']:
            raise ValueError(f"Unknown segment: {segment}")
        
        segment_config = segments_data['segments'][segment]
        
        # Compose newsletter
        html = compose_insights_newsletter(synthesis, segment_config)
        
        # Save result
        save_newsletter(html, output_file)
        
        # Log execution time
        elapsed = (datetime.now() - start_time).total_seconds()
        log(f"\n⏱️ Total execution time: {elapsed:.2f} seconds")
        
        return True
        
    except Exception as e:
        log(f"\n❌ FATAL ERROR: {str(e)}")
        import traceback
        log(traceback.format_exc())
        return False

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
