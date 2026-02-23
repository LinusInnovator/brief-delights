"""
Base class for all automation modules.

Every automation inherits from this to ensure:
- Feature flags work
- Errors don't break core pipeline
- Logging is consistent
- Dry-run mode exists
"""

from abc import ABC, abstractmethod
import json
import os
from datetime import datetime
from pathlib import Path


class AutomationModule(ABC):
    """Base class for all automation modules"""
    
    def __init__(self, name: str):
        self.name = name
        self.config = self.load_config()
        self.enabled = self.config.get('enabled', False)
        self.dry_run = self.config.get('dry_run', True)
    
    def load_config(self) -> dict:
        """Load module configuration from feature flags file"""
        config_path = Path(__file__).parent.parent.parent / 'config' / 'automation_flags.json'
        
        if not config_path.exists():
            self.log(f"⚠️  Config file not found, using defaults", level="warning")
            return {}
        
        try:
            with open(config_path) as f:
                flags = json.load(f)
            return flags.get(self.name, {})
        except Exception as e:
            self.log(f"❌ Error loading config: {e}", level="error")
            return {}
    
    def should_run(self) -> bool:
        """Check if this module should run"""
        if not self.enabled:
            self.log("⏸️  Module is disabled")
            return False
        return True
    
    def log(self, message: str, level: str = "info"):
        """Log with timestamp and module name"""
        timestamp = datetime.now().isoformat()
        prefix = {
            "info": "ℹ️ ",
            "success": "✅",
            "warning": "⚠️ ",
            "error": "❌"
        }.get(level, "")
        
        print(f"[{timestamp}] [{self.name}] {prefix} {message}")
    
    @abstractmethod
    def run(self) -> dict:
        """
        Main execution logic - must be implemented by each module
        
        Returns:
            dict: Result summary (for logging/monitoring)
        """
        pass
    
    def safe_run(self) -> dict:
        """
        Wrapper that handles errors and dry-run mode
        
        Returns:
            dict: Result with status
        """
        if not self.should_run():
            return {"status": "skipped", "reason": "disabled"}
        
        try:
            if self.dry_run:
                self.log("🧪 Running in DRY RUN mode")
            
            result = self.run()
            
            self.log(f"✅ Completed successfully", level="success")
            self.report_success(result)
            
            return {"status": "success", "result": result, "dry_run": self.dry_run}
            
        except Exception as e:
            error_msg = f"Error: {str(e)}"
            self.log(error_msg, level="error")
            self.report_error(e)
            
            # Don't re-raise - let other modules continue
            return {"status": "error", "error": str(e)}
    
    def report_success(self, result: dict):
        """Report successful run to monitoring system"""
        # TODO: Log to Supabase analytics table
        self.log(f"Result: {result}")
    
    def report_error(self, error: Exception):
        """Report error to monitoring system"""
        # TODO: Send alert, log to Supabase
        self.log(f"Logged error: {type(error).__name__}")
