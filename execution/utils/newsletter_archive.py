#!/usr/bin/env python3
"""
Newsletter Archive & Fallback System
Automatically archives successful newsletters and provides fallback mechanism.
"""

import shutil
from pathlib import Path
from datetime import datetime, timedelta
import json


class NewsletterArchive:
    """Manages newsletter archiving and fallback"""
    
    def __init__(self, tmp_dir: Path):
        self.tmp_dir = tmp_dir
        self.archive_dir = tmp_dir / "archive"
        self.archive_dir.mkdir(exist_ok=True)
        
    def archive_newsletter(self, segment_id: str, newsletter_path: Path) -> bool:
        """
        Archive a successfully generated newsletter.
        
        Args:
            segment_id: Segment identifier (builders/leaders/innovators)
            newsletter_path: Path to newsletter HTML
            
        Returns:
            True if archived successfully
        """
        if not newsletter_path.exists():
            print(f"⚠️ Newsletter not found for archiving: {newsletter_path}")
            return False
        
        # Create archive filename with timestamp
        today = datetime.now().strftime("%Y-%m-%d")
        archive_filename = f"newsletter_{segment_id}_{today}.html"
        archive_path = self.archive_dir / archive_filename
        
        try:
            shutil.copy2(newsletter_path, archive_path)
            print(f"✅ Archived newsletter: {archive_filename}")
            
            # Also save metadata
            metadata = {
                "segment": segment_id,
                "date": today,
                "archived_at": datetime.now().isoformat(),
                "original_path": str(newsletter_path),
                "size_bytes": newsletter_path.stat().st_size
            }
            
            metadata_path = self.archive_dir / f"newsletter_{segment_id}_{today}.json"
            with open(metadata_path, 'w') as f:
                json.dump(metadata, f, indent=2)
            
            return True
            
        except Exception as e:
            print(f"❌ Archive failed: {str(e)}")
            return False
    
    def get_fallback_newsletter(self, segment_id: str) -> Path | None:
        """
        Get yesterday's newsletter as fallback.
        
        Args:
            segment_id: Segment identifier
            
        Returns:
            Path to fallback newsletter, or None if not found
        """
        # Try yesterday first
        yesterday = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")
        fallback_path = self.archive_dir / f"newsletter_{segment_id}_{yesterday}.html"
        
        if fallback_path.exists():
            print(f"✅ Found fallback newsletter: {fallback_path.name}")
            return fallback_path
        
        # Try day before yesterday
        day_before = (datetime.now() - timedelta(days=2)).strftime("%Y-%m-%d")
        fallback_path = self.archive_dir / f"newsletter_{segment_id}_{day_before}.html"
        
        if fallback_path.exists():
            print(f"✅ Found fallback newsletter: {fallback_path.name}")
            return fallback_path
        
        print(f"❌ No fallback newsletter found for {segment_id}")
        return None
    
    def modify_fallback_header(self, html: str, fallback_date: str) -> str:
        """
        Modify HTML to indicate it's a fallback send.
        
        Args:
            html: Original HTML content
            fallback_date: Date of the fallback newsletter
            
        Returns:
            Modified HTML
        """
        # Add warning header
        warning = f"""
        <div style="background-color: #fff3cd; border: 2px solid #ffc107; border-radius: 8px; padding: 16px; margin-bottom: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
            <h3 style="color: #856404; margin: 0 0 8px 0; font-size: 18px;">⚠️ Technical Issue</h3>
            <p style="color: #856404; margin: 0; font-size: 14px;">
                We experienced a technical issue generating today's newsletter. 
                Here's yesterday's brief ({fallback_date}) instead. 
                We'll be back to normal tomorrow!
            </p>
        </div>
        """
        
        # Insert after opening body tag
        if '<body' in html:
            body_end = html.find('>', html.find('<body')) + 1
            html = html[:body_end] + warning + html[body_end:]
        
        return html
    
    def cleanup_old_archives(self, days_to_keep: int = 7):
        """
        Remove archives older than specified days.
        
        Args:
            days_to_keep: Number of days to keep archives
        """
        cutoff_date = datetime.now() - timedelta(days=days_to_keep)
        
        for file in self.archive_dir.glob("newsletter_*.html"):
            # Extract date from filename
            try:
                parts = file.stem.split('_')
                if len(parts) >= 3:
                    date_str = parts[2]  # Format: newsletter_SEGMENT_YYYY-MM-DD
                    file_date = datetime.strptime(date_str, "%Y-%m-%d")
                    
                    if file_date < cutoff_date:
                        file.unlink()
                        # Also remove metadata
                        metadata_file = file.with_suffix('.json')
                        if metadata_file.exists():
                            metadata_file.unlink()
                        print(f"🗑️ Removed old archive: {file.name}")
            except Exception as e:
                print(f"⚠️ Couldn't process {file.name}: {str(e)}")


if __name__ == "__main__":
    # Test archive system
    from pathlib import Path
    
    tmp_dir = Path(__file__).parent.parent / ".tmp"
    archive = NewsletterArchive(tmp_dir)
    
    print("\n📦 Newsletter Archive System Test")
    print("=" * 50)
    
    # List existing archives
    archives = list(archive.archive_dir.glob("newsletter_*.html"))
    print(f"\nExisting archives: {len(archives)}")
    for arch in archives[:5]:
        print(f"  - {arch.name}")
    
    # Test fallback
    print("\n🔄 Testing fallback retrieval:")
    for segment in ["builders", "leaders", "innovators"]:
        fallback = archive.get_fallback_newsletter(segment)
        if fallback:
            print(f"  ✅ {segment}: {fallback.name}")
        else:
            print(f"  ❌ {segment}: No fallback available")
