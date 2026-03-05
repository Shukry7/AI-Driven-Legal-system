"""
Simple test script for the Legal Risk Classification API.
Run this after starting the server to verify everything works.
"""
import requests
import json

API_BASE = "http://localhost:8000/api"

def test_health():
    """Test health check endpoint."""
    print("\n" + "="*60)
    print("Testing Health Check...")
    print("="*60)
    
    try:
        response = requests.get(f"{API_BASE}/health")
        print(f"Status: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        return response.status_code == 200
    except Exception as e:
        print(f"Error: {str(e)}")
        return False


def test_text_classification():
    """Test text classification endpoint."""
    print("\n" + "="*60)
    print("Testing Text Classification...")
    print("="*60)
    
    sample_text = """
    The Court finds that the Defendant did breach the contract by failing to deliver 
    the materials within the agreed timeframe. The Plaintiff has provided sufficient 
    evidence of financial losses. However, the quantum of damages claimed appears to 
    be excessive. The Court orders the Defendant to pay Rs. 2,500,000 within 60 days.
    """
    
    try:
        response = requests.post(
            f"{API_BASE}/classify/text",
            json={"text": sample_text}
        )
        
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"\nTotal Clauses: {result['total_clauses']}")
            print(f"Risk Summary:")
            print(f"  - High Risk: {result['risk_summary']['High']}")
            print(f"  - Medium Risk: {result['risk_summary']['Medium']}")
            print(f"  - Low Risk: {result['risk_summary']['Low']}")
            
            print(f"\nClauses:")
            for clause in result['clauses']:
                print(f"\n  Clause #{clause['id']}")
                print(f"  Risk: {clause['risk']} ({clause['confidence']}% confidence)")
                print(f"  Text: {clause['text'][:80]}...")
                print(f"  Key Factors: {', '.join(clause['keyFactors'])}")
            
            return True
        else:
            print(f"Error: {response.json()}")
            return False
            
    except Exception as e:
        print(f"Error: {str(e)}")
        return False


def test_file_classification():
    """Test file classification endpoint."""
    print("\n" + "="*60)
    print("Testing File Classification...")
    print("="*60)
    
    try:
        with open("test_judgment.txt", "rb") as f:
            files = {"file": ("test_judgment.txt", f, "text/plain")}
            response = requests.post(
                f"{API_BASE}/classify/file",
                files=files
            )
        
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"\nTotal Clauses: {result['total_clauses']}")
            print(f"Risk Summary:")
            print(f"  - High Risk: {result['risk_summary']['High']}")
            print(f"  - Medium Risk: {result['risk_summary']['Medium']}")
            print(f"  - Low Risk: {result['risk_summary']['Low']}")
            
            print(f"\nFirst 3 Clauses:")
            for clause in result['clauses'][:3]:
                print(f"\n  Clause #{clause['id']}")
                print(f"  Risk: {clause['risk']} ({clause['confidence']}% confidence)")
                print(f"  Text: {clause['text'][:100]}...")
            
            return True
        else:
            print(f"Error: {response.json()}")
            return False
            
    except FileNotFoundError:
        print("Error: test_judgment.txt not found")
        return False
    except Exception as e:
        print(f"Error: {str(e)}")
        return False


def main():
    """Run all tests."""
    print("="*60)
    print("Legal Risk Classification API - Test Suite")
    print("="*60)
    print("\nMake sure the server is running on http://localhost:8000")
    print("Start it with: python fastapi_server.py")
    
    input("\nPress Enter to start tests...")
    
    results = {
        "Health Check": test_health(),
        "Text Classification": test_text_classification(),
        "File Classification": test_file_classification()
    }
    
    print("\n" + "="*60)
    print("Test Results Summary")
    print("="*60)
    
    all_passed = True
    for test_name, passed in results.items():
        status = "✓ PASSED" if passed else "✗ FAILED"
        print(f"{test_name}: {status}")
        if not passed:
            all_passed = False
    
    print("\n" + "="*60)
    if all_passed:
        print("All tests PASSED! ✓")
        print("\nYou can now:")
        print("1. Open http://localhost:8000/api in your browser for the test interface")
        print("2. Open http://localhost:8000/docs for API documentation")
        print("3. Integrate with your frontend application")
    else:
        print("Some tests FAILED. Please check the errors above.")
    print("="*60)


if __name__ == "__main__":
    main()
