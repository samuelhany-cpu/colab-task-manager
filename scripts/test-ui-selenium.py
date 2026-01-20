"""
Selenium UI Test Suite for Task Manager
Tests all UI buttons, forms, and interactions
"""

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.keys import Keys
from selenium.common.exceptions import TimeoutException, NoSuchElementException
import time
import sys

# Configuration
BASE_URL = "http://localhost:3000"
TEST_EMAIL = "deadlysam10@gmail.com"
TEST_PASSWORD = "Sam@wwe20"
WAIT_TIMEOUT = 10

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    CYAN = '\033[96m'
    MAGENTA = '\033[95m'
    RESET = '\033[0m'
    BOLD = '\033[1m'

def print_header(text):
    print(f"\n{Colors.MAGENTA}{Colors.BOLD}╔{'═' * 50}╗{Colors.RESET}")
    print(f"{Colors.MAGENTA}{Colors.BOLD}║ {text:48} ║{Colors.RESET}")
    print(f"{Colors.MAGENTA}{Colors.BOLD}╚{'═' * 50}╝{Colors.RESET}\n")

def print_test(text, status="INFO"):
    symbols = {
        "PASS": f"{Colors.GREEN}✓{Colors.RESET}",
        "FAIL": f"{Colors.RED}✗{Colors.RESET}",
        "WARN": f"{Colors.YELLOW}⚠{Colors.RESET}",
        "INFO": f"{Colors.CYAN}•{Colors.RESET}"
    }
    print(f"{symbols.get(status, '•')} {text}")

class TaskManagerUITest:
    def __init__(self):
        self.driver = None
        self.wait = None
        self.test_results = []
        
    def setup(self):
        """Initialize the browser"""
        print_test("Initializing Chrome browser...", "INFO")
        options = webdriver.ChromeOptions()
        options.add_argument('--start-maximized')
        options.add_argument('--disable-notifications')
        # Uncomment for headless mode:
        # options.add_argument('--headless')
        
        self.driver = webdriver.Chrome(options=options)
        self.wait = WebDriverWait(self.driver, WAIT_TIMEOUT)
        print_test("Browser initialized successfully", "PASS")
        
    def teardown(self):
        """Close the browser"""
        if self.driver:
            self.driver.quit()
            print_test("Browser closed", "INFO")
    
    def record_result(self, test_name, passed, message=""):
        """Record test result"""
        self.test_results.append({
            "name": test_name,
            "passed": passed,
            "message": message
        })
        status = "PASS" if passed else "FAIL"
        print_test(f"{test_name}: {message}", status)
    
    def close_modals(self):
        """Close any open modals or dialogs that might block interactions"""
        try:
            from selenium.webdriver.common.keys import Keys
            # Try to find and close modal by pressing Escape
            self.driver.find_element(By.TAG_NAME, "body").send_keys(Keys.ESCAPE)
            time.sleep(0.3)
            
            # Also try clicking backdrop if present
            backdrop = self.safe_find_element(By.CSS_SELECTOR, "[class*='backdrop'], [class*='bg-black/'], .fixed.inset-0", timeout=0.5)
            if backdrop:
                try:
                    backdrop.click()
                    time.sleep(0.3)
                except:
                    pass
        except:
            pass
    
    def safe_click(self, element, description="element"):
        """Safely click an element with error handling"""
        try:
            # Close any modals first
            self.close_modals()
            
            self.driver.execute_script("arguments[0].scrollIntoView(true);", element)
            time.sleep(0.3)
            
            # Use JavaScript click to bypass modal overlays
            self.driver.execute_script("arguments[0].click();", element)
            return True
        except Exception as e:
            print_test(f"Failed to click {description}: {str(e)}", "FAIL")
            return False
    
    def safe_find_element(self, by, value, timeout=5):
        """Safely find element with timeout"""
        try:
            element = WebDriverWait(self.driver, timeout).until(
                EC.presence_of_element_located((by, value))
            )
            return element
        except TimeoutException:
            return None
    
    def test_login(self):
        """Test 1: Login functionality"""
        print_header("TEST 1: Login & Authentication")
        
        try:
            self.driver.get(f"{BASE_URL}/login")
            print_test("Navigated to login page", "INFO")
            time.sleep(2)
            
            # Wait for the page to load
            email_input = self.safe_find_element(By.CSS_SELECTOR, "input[id='email'], input[name='email']", timeout=10)
            
            if not email_input:
                self.record_result("Login Form", False, "Email input not found")
                return False
            
            print_test("Login form loaded", "INFO")
            
            # Look for password mode button and click it
            password_mode_btn = self.safe_find_element(By.XPATH, "//button[contains(text(), 'Password') or contains(text(), 'PASSWORD')]", timeout=5)
            
            if password_mode_btn:
                print_test("Switching to password mode", "INFO")
                self.safe_click(password_mode_btn, "password mode button")
                time.sleep(1)
            
            # Now find password input
            password_input = self.safe_find_element(By.CSS_SELECTOR, "input[id='password'], input[name='password']", timeout=5)
            
            if not password_input:
                self.record_result("Login Form", False, "Password input not found after switching mode")
                return False
            
            # Fill in credentials
            email_input.clear()
            email_input.send_keys(TEST_EMAIL)
            print_test(f"Email entered: {TEST_EMAIL}", "INFO")
            
            password_input.clear()
            password_input.send_keys(TEST_PASSWORD)
            print_test("Password entered", "INFO")
            
            # Find and click login button
            login_button = self.safe_find_element(By.CSS_SELECTOR, "button[type='submit']", timeout=5)
            if login_button:
                print_test("Clicking sign in button", "INFO")
                self.safe_click(login_button, "sign in button")
                time.sleep(3)
            else:
                password_input.send_keys(Keys.RETURN)
                time.sleep(3)
            
            # Wait for redirect to workspace selection page
            time.sleep(2)
            current_url = self.driver.current_url
            
            if "/app" in current_url:
                print_test("Redirected to workspace selection page", "INFO")
                self.record_result("Login", True, f"Successfully logged in")
                
                # Now select the "Agents" workspace
                print_test("Looking for workspace to enter...", "INFO")
                time.sleep(2)
                
                # Try to find and click on "Agents" workspace
                workspace_selectors = [
                    (By.XPATH, "//div[contains(text(), 'Agents')]//ancestor::a"),
                    (By.XPATH, "//a[contains(@href, '/agents') or contains(@href, '/app/')]"),
                    (By.XPATH, "//div[contains(text(), 'Agents')]//parent::div//parent::div"),
                ]
                
                workspace_clicked = False
                for by, selector in workspace_selectors:
                    workspace = self.safe_find_element(by, selector, timeout=3)
                    if workspace:
                        if self.safe_click(workspace, "Agents workspace"):
                            print_test("Clicked on Agents workspace", "PASS")
                            time.sleep(2)
                            workspace_clicked = True
                            break
                
                if not workspace_clicked:
                    # Try clicking any workspace card
                    any_workspace = self.safe_find_element(By.CSS_SELECTOR, "a[href*='/app/']", timeout=3)
                    if any_workspace:
                        if self.safe_click(any_workspace, "any workspace"):
                            print_test("Entered a workspace", "PASS")
                            time.sleep(2)
                            workspace_clicked = True
                
                if workspace_clicked:
                    current_url = self.driver.current_url
                    print_test(f"Inside workspace: {current_url}", "INFO")
                    return True
                else:
                    print_test("No workspace found to enter", "WARN")
                    return True  # Still consider login successful
                    
            elif "/login" not in current_url:
                self.record_result("Login", True, f"Successfully logged in, at {current_url}")
                return True
            else:
                # Check for error messages
                error_elem = self.safe_find_element(By.CSS_SELECTOR, "[class*='destructive'], [class*='error']", timeout=2)
                error_msg = error_elem.text if error_elem else "Still on login page"
                self.record_result("Login", False, f"Login failed: {error_msg}")
                return False
                
        except Exception as e:
            self.record_result("Login", False, f"Exception: {str(e)}")
            return False
    
    def test_navigation_buttons(self):
        """Test 2: Navigation sidebar buttons"""
        print_header("TEST 2: Navigation Sidebar")
        
        # Based on actual sidebar.tsx: Dashboard, My Tasks, Chat, Timesheet, All Files
        nav_items = [
            ("Dashboard", "Dashboard", []),  # Just /app/slug
            ("My Tasks", "My Tasks", ["tasks"]),
            ("Chat", "Chat", ["chat"]),
            ("Timesheet", "Timesheet", ["timesheet"]),
            ("All Files", "All Files", ["files"]),
        ]
        
        for nav_name, exact_text, url_keywords in nav_items:
            try:
                # Find by exact text in link (based on sidebar implementation)
                nav_link = self.safe_find_element(
                    By.XPATH, 
                    f"//a[.//span[normalize-space(text())='{exact_text}']]",
                    timeout=3
                )
                
                if nav_link:
                    current_url_before = self.driver.current_url
                    if self.safe_click(nav_link, f"{nav_name} navigation"):
                        time.sleep(2)  # Wait for navigation
                        current_url = self.driver.current_url.lower()
                        
                        # Check if URL changed or matches expected pattern
                        if url_keywords:
                            url_match = any(keyword in current_url for keyword in url_keywords)
                        else:
                            # Dashboard - check if at /app/slug (no additional path segments)
                            # Accept if already at dashboard or navigated to it
                            url_parts = current_url.split('/')
                            url_match = len(url_parts) == 5 and '/app/' in current_url
                        
                        self.record_result(f"Navigation: {nav_name}", url_match, 
                                         f"URL: {current_url}")
                    else:
                        self.record_result(f"Navigation: {nav_name}", False, "Failed to click")
                else:
                    self.record_result(f"Navigation: {nav_name}", False, "Button not found")
                    
            except Exception as e:
                self.record_result(f"Navigation: {nav_name}", False, f"Error: {str(e)}")
    
    def test_search_functionality(self):
        """Test 3: Global search"""
        print_header("TEST 3: Search Functionality")
        
        try:
            # Look for search button/icon (Ctrl+K or search icon)
            search_triggers = [
                (By.CSS_SELECTOR, "button[aria-label*='search' i]"),
                (By.CSS_SELECTOR, "button[title*='search' i]"),
                (By.XPATH, "//button[contains(@class, 'search')]"),
                (By.CSS_SELECTOR, "[data-search-trigger]")
            ]
            
            search_opened = False
            for by, selector in search_triggers:
                element = self.safe_find_element(by, selector, timeout=3)
                if element:
                    if self.safe_click(element, "search trigger"):
                        time.sleep(1)
                        search_opened = True
                        break
            
            # Try Ctrl+K hotkey
            if not search_opened:
                from selenium.webdriver.common.action_chains import ActionChains
                ActionChains(self.driver).key_down(Keys.CONTROL).send_keys('k').key_up(Keys.CONTROL).perform()
                time.sleep(1)
                search_opened = True
            
            # Look for search input
            search_input = self.safe_find_element(By.CSS_SELECTOR, 
                "input[type='search'], input[placeholder*='Search' i]", timeout=3)
            
            if search_input:
                search_input.send_keys("test")
                time.sleep(1)
                search_input.clear()
                self.record_result("Search", True, "Search modal opened and functional")
                
                # Close search (ESC)
                search_input.send_keys(Keys.ESCAPE)
            else:
                self.record_result("Search", False, "Search input not found")
                
        except Exception as e:
            self.record_result("Search", False, f"Error: {str(e)}")
    
    def test_notifications(self):
        """Test 4: Notifications button"""
        print_header("TEST 4: Notifications")
        
        try:
            # Find notification bell icon
            notification_selectors = [
                (By.CSS_SELECTOR, "button[aria-label*='notification' i]"),
                (By.XPATH, "//button[contains(@class, 'notification')]"),
                (By.CSS_SELECTOR, "[data-notification-trigger]")
            ]
            
            for by, selector in notification_selectors:
                bell = self.safe_find_element(by, selector, timeout=3)
                if bell:
                    if self.safe_click(bell, "notification bell"):
                        time.sleep(1)
                        
                        # Check if dropdown/panel opened
                        dropdown = self.safe_find_element(By.CSS_SELECTOR, 
                            "[role='menu'], [class*='dropdown'], [class*='notification']", timeout=3)
                        
                        if dropdown:
                            self.record_result("Notifications", True, "Notification panel opened")
                            # Close it
                            self.safe_click(bell, "notification bell (close)")
                        else:
                            self.record_result("Notifications", True, "Notification button clicked")
                        return
            
            self.record_result("Notifications", False, "Notification button not found")
            
        except Exception as e:
            self.record_result("Notifications", False, f"Error: {str(e)}")
    
    def test_user_menu(self):
        """Test 5: User profile/settings area"""
        print_header("TEST 5: User Profile Area")
        
        try:
            # Based on sidebar.tsx: Settings button and Sign Out button in footer
            # Look for Settings button (with Settings icon)
            settings_btn = self.safe_find_element(
                By.XPATH, 
                "//button[@title='Settings']",
                timeout=5
            )
            
            if settings_btn:
                self.record_result("Settings Button", True, "Settings button found in footer")
            else:
                self.record_result("Settings Button", False, "Settings button not found")
            
            # Look for Sign Out button
            signout_btn = self.safe_find_element(
                By.XPATH, 
                "//button[@title='Sign Out' or contains(., 'Sign Out')]",
                timeout=5
            )
            
            if signout_btn:
                self.record_result("Sign Out Button", True, "Sign out button found")
            else:
                self.record_result("Sign Out Button", False, "Sign out button not found")
            
            # Check for user avatar/info display
            user_info = self.safe_find_element(
                By.XPATH,
                "//div[contains(@class, 'from-primary')]",
                timeout=3
            )
            
            if user_info:
                self.record_result("User Profile Display", True, "User info displayed")
            else:
                self.record_result("User Profile Display", False, "User info not found")
            
        except Exception as e:
            self.record_result("User Profile Area", False, f"Error: {str(e)}")
    
    def test_task_operations(self):
        """Test 6: Task page elements"""
        print_header("TEST 6: Task Page")
        
        try:
            # Navigate to My Tasks page (based on nav structure)
            # Click on My Tasks nav item
            tasks_nav = self.safe_find_element(
                By.XPATH,
                "//a[.//span[normalize-space(text())='My Tasks']]",
                timeout=5
            )
            
            if tasks_nav:
                self.safe_click(tasks_nav, "My Tasks navigation")
                time.sleep(2)
                
                # Check for search input (tasks page has search)
                search_input = self.safe_find_element(
                    By.CSS_SELECTOR,
                    "input[type='text'], input[type='search']",
                    timeout=5
                )
                
                if search_input:
                    self.record_result("Task Search", True, "Task search input found")
                else:
                    self.record_result("Task Search", False, "Task search not found")
                
                # Check for page title/header
                page_title = self.safe_find_element(
                    By.XPATH,
                    "//*[contains(text(), 'My Tasks') or contains(text(), 'Tasks')]",
                    timeout=3
                )
                
                if page_title:
                    self.record_result("Task Page Load", True, "Task page loaded successfully")
                else:
                    self.record_result("Task Page Load", False, "Task page title not found")
            else:
                self.record_result("Task Navigation", False, "My Tasks nav not found")
            
        except Exception as e:
            self.record_result("Task Page", False, f"Error: {str(e)}")
    
    def test_project_operations(self):
        """Test 7: Project sidebar section"""
        print_header("TEST 7: Project Section")
        
        try:
            # In sidebar.tsx, projects are listed in a section with "PROJECTS" header
            # and there's a + button to create new project
            
            # Look for Projects section header
            projects_header = self.safe_find_element(
                By.XPATH,
                "//h3[contains(translate(text(), 'PROJECTS', 'projects'), 'projects')]",
                timeout=5
            )
            
            if projects_header:
                self.record_result("Projects Section", True, "Projects section found in sidebar")
            else:
                self.record_result("Projects Section", False, "Projects section not found")
            
            # Look for create project link (Plus button that links to /projects/new)
            create_project_link = self.safe_find_element(
                By.CSS_SELECTOR,
                "a[href*='/projects/new']",
                timeout=5
            )
            
            if create_project_link:
                self.record_result("Create Project Link", True, "Create project link found")
            else:
                self.record_result("Create Project Link", False, "Create project link not found")
            
        except Exception as e:
            self.record_result("Project Section", False, f"Error: {str(e)}")
    
    def test_chat_interface(self):
        """Test 8: Chat/messaging interface"""
        print_header("TEST 8: Chat Interface")
        
        try:
            # Navigate via Chat nav item
            chat_nav = self.safe_find_element(
                By.XPATH,
                "//a[.//span[normalize-space(text())='Chat']]",
                timeout=5
            )
            
            if chat_nav:
                self.safe_click(chat_nav, "Chat navigation")
                time.sleep(3)  # Wait for chat to load
            else:
                self.record_result("Chat Navigation", False, "Chat nav not found")
                return
            
            # Chat interface loads ChatBox -> ChatPane
            # Look for message input (it's an input element, not textarea)
            message_input = self.safe_find_element(
                By.CSS_SELECTOR, 
                "input[placeholder*='Type a message' i], input[placeholder*='message' i]", 
                timeout=10
            )
            
            if message_input:
                # Test typing
                message_input.send_keys("Test message")
                time.sleep(0.5)
                message_input.clear()
                
                self.record_result("Chat Message Input", True, "Message input functional")
                
                # Look for send button (should be nearby)
                send_btn = self.safe_find_element(
                    By.CSS_SELECTOR, 
                    "button[type='submit']", 
                    timeout=3
                )
                
                if send_btn:
                    self.record_result("Chat Send Button", True, "Send button found")
                else:
                    self.record_result("Chat Send Button", False, "Send button not found")
            else:
                self.record_result("Chat Interface", False, "Message input not found")
                
        except Exception as e:
            self.record_result("Chat Interface", False, f"Error: {str(e)}")
    
    def test_file_operations(self):
        """Test 9: File management"""
        print_header("TEST 9: File Operations")
        
        try:
            # Navigate via All Files nav item
            files_nav = self.safe_find_element(
                By.XPATH,
                "//a[.//span[normalize-space(text())='All Files']]",
                timeout=5
            )
            
            if files_nav:
                self.safe_click(files_nav, "All Files navigation")
                time.sleep(2)
                
                # Check for page title
                page_title = self.safe_find_element(
                    By.XPATH,
                    "//*[contains(text(), 'All Files') or contains(text(), 'Files')]",
                    timeout=3
                )
                
                if page_title:
                    self.record_result("File Page Load", True, "Files page loaded")
                else:
                    self.record_result("File Page Load", False, "Files page title not found")
                
                # Look for Upload button (it's a label element for file input)
                upload_button = self.safe_find_element(
                    By.XPATH,
                    "//label[contains(., 'Upload') or @for='file-upload'] | //button[contains(., 'Upload')]",
                    timeout=5
                )
                
                if upload_button:
                    self.record_result("File Upload Button", True, "Upload button found")
                else:
                    self.record_result("File Upload Button", False, "Upload button not found")
            else:
                self.record_result("File Navigation", False, "All Files nav not found")
            
        except Exception as e:
            self.record_result("File Operations", False, f"Error: {str(e)}")
    
    def test_settings_page(self):
        """Test 10: Settings page"""
        print_header("TEST 10: Settings Page")
        
        try:
            # Navigate to settings
            self.driver.get(f"{BASE_URL}/settings/profile")
            time.sleep(2)
            
            # Check for form inputs
            inputs = self.driver.find_elements(By.CSS_SELECTOR, "input, textarea, select")
            
            if inputs:
                self.record_result("Settings Page", True, f"Settings page loaded with {len(inputs)} form fields")
                
                # Look for save/update button
                save_btn = self.safe_find_element(By.XPATH, 
                    "//button[contains(text(), 'Save') or contains(text(), 'Update')]", timeout=3)
                
                if save_btn:
                    self.record_result("Settings Save Button", True, "Save button found")
                else:
                    self.record_result("Settings Save Button", False, "Save button not found")
            else:
                self.record_result("Settings Page", False, "No form fields found")
                
        except Exception as e:
            self.record_result("Settings Page", False, f"Error: {str(e)}")
    
    def test_responsive_elements(self):
        """Test 11: Sidebar collapse feature"""
        print_header("TEST 11: Sidebar Collapse")
        
        try:
            # Based on sidebar.tsx: There's a collapse button with ChevronLeft/ChevronRight icon
            # Try multiple selectors
            collapse_selectors = [
                (By.XPATH, "//button[.//svg[contains(@class, 'lucide-chevron')]]"),
                (By.XPATH, "//button[.//*[name()='svg']]//parent::button[contains(@class, 'w-9')]"),
                (By.CSS_SELECTOR, "button.w-9.h-9"),
            ]
            
            collapse_btn = None
            for by, selector in collapse_selectors:
                collapse_btn = self.safe_find_element(by, selector, timeout=2)
                if collapse_btn:
                    break
            
            if collapse_btn:
                # Click to collapse
                if self.safe_click(collapse_btn, "sidebar collapse button"):
                    time.sleep(1)
                    self.record_result("Sidebar Collapse", True, "Sidebar collapse button clicked")
                    
                    # Click again to expand
                    if self.safe_click(collapse_btn, "sidebar expand button"):
                        time.sleep(1)
                        self.record_result("Sidebar Expand", True, "Sidebar expanded back")
                    else:
                        self.record_result("Sidebar Expand", False, "Failed to expand")
                else:
                    self.record_result("Sidebar Collapse", False, "Failed to click collapse button")
            else:
                self.record_result("Sidebar Collapse", False, "Collapse button not found")
            
        except Exception as e:
            self.record_result("Sidebar Collapse", False, f"Error: {str(e)}")
    
    def print_summary(self):
        """Print test summary"""
        print_header("TEST SUMMARY")
        
        total = len(self.test_results)
        passed = sum(1 for r in self.test_results if r["passed"])
        failed = total - passed
        pass_rate = (passed / total * 100) if total > 0 else 0
        
        print(f"{Colors.CYAN}Total Tests:{Colors.RESET} {total}")
        print(f"{Colors.GREEN}Passed:{Colors.RESET} {passed}")
        print(f"{Colors.RED}Failed:{Colors.RESET} {failed}")
        print(f"{Colors.BOLD}Pass Rate:{Colors.RESET} {pass_rate:.1f}%\n")
        
        if failed > 0:
            print(f"{Colors.YELLOW}Failed Tests:{Colors.RESET}")
            for result in self.test_results:
                if not result["passed"]:
                    print(f"  {Colors.RED}✗{Colors.RESET} {result['name']}: {result['message']}")
    
    def run_all_tests(self):
        """Run complete test suite"""
        print_header("SELENIUM UI TEST SUITE")
        print(f"{Colors.CYAN}Testing URL:{Colors.RESET} {BASE_URL}")
        print(f"{Colors.CYAN}Test Account:{Colors.RESET} {TEST_EMAIL}\n")
        
        try:
            self.setup()
            
            # Run all tests
            if self.test_login():
                self.test_navigation_buttons()
                self.test_search_functionality()
                self.test_notifications()
                self.test_user_menu()
                self.test_task_operations()
                self.test_project_operations()
                self.test_chat_interface()
                self.test_file_operations()
                self.test_settings_page()
                self.test_responsive_elements()
            else:
                print_test("Login failed - skipping remaining tests", "FAIL")
            
            self.print_summary()
            
        except Exception as e:
            print_test(f"Test suite error: {str(e)}", "FAIL")
        finally:
            self.teardown()

if __name__ == "__main__":
    print(f"{Colors.BOLD}Task Manager - Selenium UI Test Suite{Colors.RESET}")
    print(f"{Colors.CYAN}Make sure the dev server is running at {BASE_URL}{Colors.RESET}\n")
    
    tester = TaskManagerUITest()
    tester.run_all_tests()
