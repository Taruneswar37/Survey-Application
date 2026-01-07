import requests
import sys
import json
from datetime import datetime

class SurveyAPITester:
    def __init__(self, base_url="https://pollwave-11.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.created_survey_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"   Response: {json.dumps(response_data, indent=2)[:200]}...")
                    return True, response_data
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Error: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_user_registration(self):
        """Test user registration"""
        timestamp = datetime.now().strftime('%H%M%S')
        test_user_data = {
            "email": f"test_user_{timestamp}@example.com",
            "password": "TestPass123!",
            "full_name": f"Test User {timestamp}"
        }
        
        success, response = self.run_test(
            "User Registration",
            "POST",
            "auth/register",
            200,
            data=test_user_data
        )
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.user_id = response['user']['id']
            print(f"   ✅ User registered with ID: {self.user_id}")
            return True
        return False

    def test_user_login(self):
        """Test user login with existing credentials"""
        # First register a user
        timestamp = datetime.now().strftime('%H%M%S')
        register_data = {
            "email": f"login_test_{timestamp}@example.com",
            "password": "TestPass123!",
            "full_name": f"Login Test {timestamp}"
        }
        
        # Register first
        success, _ = self.run_test(
            "Pre-register for Login Test",
            "POST",
            "auth/register",
            200,
            data=register_data
        )
        
        if not success:
            return False
            
        # Now test login
        login_data = {
            "email": register_data["email"],
            "password": register_data["password"]
        }
        
        success, response = self.run_test(
            "User Login",
            "POST",
            "auth/login",
            200,
            data=login_data
        )
        
        if success and 'access_token' in response:
            # Update token for subsequent tests
            self.token = response['access_token']
            self.user_id = response['user']['id']
            return True
        return False

    def test_get_current_user(self):
        """Test getting current user info"""
        success, response = self.run_test(
            "Get Current User",
            "GET",
            "auth/me",
            200
        )
        return success

    def test_create_survey(self):
        """Test creating a survey"""
        survey_data = {
            "title": "Test Survey - Customer Feedback",
            "description": "A test survey for API testing",
            "questions": [
                {
                    "type": "multiple_choice",
                    "text": "How satisfied are you with our service?",
                    "options": ["Very Satisfied", "Satisfied", "Neutral", "Dissatisfied"],
                    "required": True
                },
                {
                    "type": "short_answer",
                    "text": "What is your name?",
                    "required": True
                },
                {
                    "type": "long_answer",
                    "text": "Please provide any additional feedback",
                    "required": False
                }
            ]
        }
        
        success, response = self.run_test(
            "Create Survey",
            "POST",
            "surveys",
            200,
            data=survey_data
        )
        
        if success and 'id' in response:
            self.created_survey_id = response['id']
            print(f"   ✅ Survey created with ID: {self.created_survey_id}")
            return True
        return False

    def test_get_surveys(self):
        """Test getting user's surveys"""
        success, response = self.run_test(
            "Get User Surveys",
            "GET",
            "surveys",
            200
        )
        
        if success:
            print(f"   ✅ Found {len(response)} surveys")
            return True
        return False

    def test_get_survey_by_id(self):
        """Test getting a specific survey"""
        if not self.created_survey_id:
            print("❌ No survey ID available for testing")
            return False
            
        success, response = self.run_test(
            "Get Survey by ID",
            "GET",
            f"surveys/{self.created_survey_id}",
            200
        )
        return success

    def test_get_public_survey(self):
        """Test getting public survey (no auth required)"""
        if not self.created_survey_id:
            print("❌ No survey ID available for testing")
            return False
            
        # Temporarily remove token for public access
        temp_token = self.token
        self.token = None
        
        success, response = self.run_test(
            "Get Public Survey",
            "GET",
            f"surveys/public/{self.created_survey_id}",
            200
        )
        
        # Restore token
        self.token = temp_token
        return success

    def test_submit_response(self):
        """Test submitting a survey response"""
        if not self.created_survey_id:
            print("❌ No survey ID available for testing")
            return False
            
        # Get the survey first to get question IDs
        success, survey = self.run_test(
            "Get Survey for Response",
            "GET",
            f"surveys/public/{self.created_survey_id}",
            200
        )
        
        if not success:
            return False
            
        # Create response data
        response_data = {
            "survey_id": self.created_survey_id,
            "respondent_name": "Test Respondent",
            "answers": []
        }
        
        for question in survey['questions']:
            if question['type'] == 'multiple_choice':
                response_data['answers'].append({
                    "question_id": question['id'],
                    "answer": question['options'][0]  # Select first option
                })
            elif question['type'] == 'short_answer':
                response_data['answers'].append({
                    "question_id": question['id'],
                    "answer": "John Doe"
                })
            elif question['type'] == 'long_answer':
                response_data['answers'].append({
                    "question_id": question['id'],
                    "answer": "This is a test feedback response for the long answer question."
                })
        
        # Remove token for public response submission
        temp_token = self.token
        self.token = None
        
        success, response = self.run_test(
            "Submit Survey Response",
            "POST",
            "responses",
            200,
            data=response_data
        )
        
        # Restore token
        self.token = temp_token
        return success

    def test_get_survey_responses(self):
        """Test getting survey responses"""
        if not self.created_survey_id:
            print("❌ No survey ID available for testing")
            return False
            
        success, response = self.run_test(
            "Get Survey Responses",
            "GET",
            f"responses/survey/{self.created_survey_id}",
            200
        )
        
        if success:
            print(f"   ✅ Found {len(response)} responses")
            return True
        return False

    def test_get_analytics(self):
        """Test getting survey analytics"""
        if not self.created_survey_id:
            print("❌ No survey ID available for testing")
            return False
            
        success, response = self.run_test(
            "Get Survey Analytics",
            "GET",
            f"analytics/{self.created_survey_id}",
            200
        )
        
        if success:
            print(f"   ✅ Analytics for survey: {response.get('survey_title', 'Unknown')}")
            print(f"   ✅ Total responses: {response.get('total_responses', 0)}")
            return True
        return False

    def test_delete_survey(self):
        """Test deleting a survey"""
        if not self.created_survey_id:
            print("❌ No survey ID available for testing")
            return False
            
        success, response = self.run_test(
            "Delete Survey",
            "DELETE",
            f"surveys/{self.created_survey_id}",
            200
        )
        return success

def main():
    print("🚀 Starting Survey API Testing...")
    print("=" * 50)
    
    tester = SurveyAPITester()
    
    # Test sequence
    tests = [
        ("User Registration", tester.test_user_registration),
        ("User Login", tester.test_user_login),
        ("Get Current User", tester.test_get_current_user),
        ("Create Survey", tester.test_create_survey),
        ("Get User Surveys", tester.test_get_surveys),
        ("Get Survey by ID", tester.test_get_survey_by_id),
        ("Get Public Survey", tester.test_get_public_survey),
        ("Submit Response", tester.test_submit_response),
        ("Get Survey Responses", tester.test_get_survey_responses),
        ("Get Analytics", tester.test_get_analytics),
        ("Delete Survey", tester.test_delete_survey),
    ]
    
    for test_name, test_func in tests:
        print(f"\n{'='*20} {test_name} {'='*20}")
        try:
            test_func()
        except Exception as e:
            print(f"❌ {test_name} failed with exception: {str(e)}")
    
    # Print final results
    print(f"\n{'='*50}")
    print(f"📊 FINAL RESULTS")
    print(f"{'='*50}")
    print(f"Tests passed: {tester.tests_passed}/{tester.tests_run}")
    success_rate = (tester.tests_passed / tester.tests_run * 100) if tester.tests_run > 0 else 0
    print(f"Success rate: {success_rate:.1f}%")
    
    if success_rate >= 80:
        print("🎉 Backend API testing PASSED!")
        return 0
    else:
        print("❌ Backend API testing FAILED!")
        return 1

if __name__ == "__main__":
    sys.exit(main())