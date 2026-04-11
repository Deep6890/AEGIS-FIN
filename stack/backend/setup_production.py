"""
setup_production.py
-------------------
Complete production setup script that:
1. Verifies environment configuration
2. Installs all dependencies
3. Runs initial data population
4. Sets up Windows Task Scheduler
5. Verifies everything is working

Run this once to set up the entire system.
"""

import os
import sys
import subprocess
from pathlib import Path

# Colors for terminal output
class Colors:
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    BLUE = '\033[94m'
    END = '\033[0m'
    BOLD = '\033[1m'

def print_step(msg):
    print(f"\n{Colors.BOLD}{Colors.BLUE}{'='*70}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.BLUE}{msg}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.BLUE}{'='*70}{Colors.END}\n")

def print_success(msg):
    print(f"{Colors.GREEN}✓ {msg}{Colors.END}")

def print_error(msg):
    print(f"{Colors.RED}✗ {msg}{Colors.END}")

def print_warning(msg):
    print(f"{Colors.YELLOW}⚠ {msg}{Colors.END}")

def check_env_file():
    """Check if .env file exists and has required variables."""
    print_step("Step 1: Checking Environment Configuration")
    
    env_path = Path(__file__).parent / ".env"
    
    if not env_path.exists():
        print_error(".env file not found!")
        print_warning("Creating .env from .env.example...")
        example_path = Path(__file__).parent / ".env.example"
        if example_path.exists():
            import shutil
            shutil.copy(example_path, env_path)
            print_success(".env file created")
            print_warning("Please edit backend/.env and add your Supabase credentials:")
            print("  - SUPABASE_URL")
            print("  - SUPABASE_SERVICE_KEY")
            return False
        else:
            print_error(".env.example not found!")
            return False
    
    # Load and check env variables
    required_vars = ["SUPABASE_URL", "SUPABASE_SERVICE_KEY"]
    missing = []
    
    with open(env_path) as f:
        env_content = f.read()
        for var in required_vars:
            if var not in env_content or f"{var}=your" in env_content:
                missing.append(var)
    
    if missing:
        print_error(f"Missing or incomplete environment variables: {', '.join(missing)}")
        print_warning("Please edit backend/.env and add your Supabase credentials")
        return False
    
    print_success("Environment configuration OK")
    return True

def install_dependencies():
    """Install Python dependencies."""
    print_step("Step 2: Installing Dependencies")
    
    req_path = Path(__file__).parent / "requirements.txt"
    if not req_path.exists():
        print_error("requirements.txt not found!")
        return False
    
    try:
        subprocess.run([sys.executable, "-m", "pip", "install", "-r", str(req_path)], check=True)
        print_success("All dependencies installed")
        return True
    except subprocess.CalledProcessError:
        print_error("Failed to install dependencies")
        return False

def run_initial_pipeline():
    """Run the pipeline once to populate initial data."""
    print_step("Step 3: Running Initial Data Population")
    
    print("This will fetch data for all companies and populate the database.")
    print("This may take 45-60 minutes depending on your internet connection.")
    response = input("\nRun initial pipeline now? (y/n): ").strip().lower()
    
    if response != 'y':
        print_warning("Skipping initial pipeline run")
        print_warning("You can run it later with: python backend/daily_pipeline.py")
        return True
    
    try:
        pipeline_script = Path(__file__).parent / "daily_pipeline.py"
        subprocess.run([sys.executable, str(pipeline_script)], check=True)
        print_success("Initial pipeline completed successfully")
        return True
    except subprocess.CalledProcessError:
        print_error("Pipeline failed - check logs in backend/pipeline_run.log")
        return False
    except KeyboardInterrupt:
        print_warning("\nPipeline interrupted - you can resume later with --resume flag")
        return True

def setup_windows_task():
    """Set up Windows Task Scheduler."""
    print_step("Step 4: Setting Up Windows Task Scheduler")
    
    if sys.platform != "win32":
        print_warning("Not on Windows - skipping Task Scheduler setup")
        print("On Linux/Mac, use cron instead:")
        print("  crontab -e")
        print("  0 13 * * 1-5 /path/to/venv/bin/python /path/to/backend/daily_pipeline.py")
        return True
    
    response = input("Set up Windows Task Scheduler for daily automation? (y/n): ").strip().lower()
    
    if response != 'y':
        print_warning("Skipping Task Scheduler setup")
        print("You can set it up later by running: backend/setup_daily_task.bat")
        return True
    
    try:
        bat_script = Path(__file__).parent / "setup_daily_task.bat"
        subprocess.run([str(bat_script)], shell=True, check=True)
        print_success("Windows Task Scheduler configured")
        return True
    except subprocess.CalledProcessError:
        print_error("Failed to set up Task Scheduler")
        print_warning("Try running backend/setup_daily_task.bat as Administrator")
        return False

def verify_setup():
    """Verify the setup is working."""
    print_step("Step 5: Verifying Setup")
    
    # Check if we can connect to Supabase
    try:
        from supabase import create_client
        
        # Load env
        env_path = Path(__file__).parent / ".env"
        env_vars = {}
        with open(env_path) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, value = line.split("=", 1)
                    env_vars[key.strip()] = value.strip()
        
        sb = create_client(env_vars["SUPABASE_URL"], env_vars["SUPABASE_SERVICE_KEY"])
        
        # Try to fetch companies
        result = sb.table("companies").select("id").limit(1).execute()
        
        if result.data is not None:
            print_success("Supabase connection OK")
            
            # Check if we have data
            companies_count = sb.table("companies").select("id", count="exact").execute().count
            sectors_count = sb.table("sectors").select("id", count="exact").execute().count
            
            print(f"  - Companies in database: {companies_count}")
            print(f"  - Sectors in database: {sectors_count}")
            
            if companies_count == 0:
                print_warning("No companies in database yet - run the pipeline to populate data")
            else:
                print_success(f"Database has {companies_count} companies")
            
            return True
        else:
            print_error("Could not fetch data from Supabase")
            return False
            
    except Exception as e:
        print_error(f"Verification failed: {e}")
        return False

def print_summary():
    """Print setup summary and next steps."""
    print_step("Setup Complete!")
    
    print(f"{Colors.BOLD}Your AEGIS-FIN system is now configured!{Colors.END}\n")
    
    print(f"{Colors.BOLD}What happens next:{Colors.END}")
    print("  1. Pipeline runs automatically every weekday at 6:30 PM IST")
    print("  2. Latest market data is fetched for all companies")
    print("  3. All analytics are computed and stored in Supabase")
    print("  4. Old data (>6 months) is automatically cleaned up")
    print("  5. Everything is logged in backend/pipeline_run.log\n")
    
    print(f"{Colors.BOLD}Useful Commands:{Colors.END}")
    print(f"  {Colors.GREEN}Run pipeline manually:{Colors.END}")
    print("    venv/Scripts/python.exe backend/daily_pipeline.py\n")
    
    print(f"  {Colors.GREEN}View logs:{Colors.END}")
    print("    type backend\\pipeline_run.log\n")
    
    print(f"  {Colors.GREEN}Check progress:{Colors.END}")
    print("    type backend\\.pipeline_progress.json\n")
    
    print(f"  {Colors.GREEN}Manual cleanup:{Colors.END}")
    print("    venv/Scripts/python.exe backend/cleanup_old_data_simple.py\n")
    
    print(f"  {Colors.GREEN}Manage scheduled task:{Colors.END}")
    print("    taskschd.msc\n")
    
    print(f"{Colors.BOLD}Documentation:{Colors.END}")
    print("  - Quick Start: backend/QUICK_START.md")
    print("  - Full Guide: backend/DAILY_PIPELINE_GUIDE.md")
    print("  - Pipeline Summary: backend/PIPELINE_SUMMARY.md\n")
    
    print(f"{Colors.BOLD}{Colors.GREEN}🚀 Your system is ready for production!{Colors.END}\n")

def main():
    """Main setup flow."""
    print(f"\n{Colors.BOLD}{Colors.BLUE}")
    print("╔═══════════════════════════════════════════════════════════════════╗")
    print("║                                                                   ║")
    print("║           AEGIS-FIN Production Setup                              ║")
    print("║           Automated Daily Pipeline System                         ║")
    print("║                                                                   ║")
    print("╚═══════════════════════════════════════════════════════════════════╝")
    print(f"{Colors.END}\n")
    
    # Run setup steps
    steps = [
        ("Environment Configuration", check_env_file),
        ("Dependencies", install_dependencies),
        ("Initial Data Population", run_initial_pipeline),
        ("Task Scheduler", setup_windows_task),
        ("Verification", verify_setup),
    ]
    
    for step_name, step_func in steps:
        if not step_func():
            print(f"\n{Colors.RED}Setup failed at: {step_name}{Colors.END}")
            print(f"{Colors.YELLOW}Please fix the issues above and run this script again.{Colors.END}\n")
            return False
    
    # Print summary
    print_summary()
    return True

if __name__ == "__main__":
    try:
        success = main()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print(f"\n\n{Colors.YELLOW}Setup interrupted by user{Colors.END}\n")
        sys.exit(1)
    except Exception as e:
        print(f"\n{Colors.RED}Unexpected error: {e}{Colors.END}\n")
        import traceback
        traceback.print_exc()
        sys.exit(1)
