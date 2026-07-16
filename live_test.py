import requests
import sys

BASE_URL = "http://localhost:3000/api"

def print_result(name, passed, message=""):
    status = "✅ PASS" if passed else "❌ FAIL"
    print(f"{status} | {name} {message}")
    if not passed:
        sys.exit(1)

def test_search_instruments():
    print("\n--- Testing Search Instruments ---")
    res = requests.get(f"{BASE_URL}/instruments?q=AAPL")
    if res.status_code != 200:
        print_result("Search Instruments (Status)", False, f"Expected 200, got {res.status_code}")
    
    data = res.json()
    if 'data' not in data or len(data['data']) == 0:
        print_result("Search Instruments (Has Data)", False, "No data returned")
    
    if data['data'][0]['ticker'] != 'AAPL':
        print_result("Search Instruments (Ticker Match)", False, f"Expected AAPL, got {data['data'][0]['ticker']}")
        
    print_result("Search Instruments", True)

def test_get_portfolio():
    print("\n--- Testing Get Portfolio ---")
    res = requests.get(f"{BASE_URL}/portfolio/1")
    if res.status_code != 200:
        print_result("Get Portfolio (Status)", False, f"Expected 200, got {res.status_code}")
    
    data = res.json()
    if 'availableCash' not in data or 'positions' not in data:
        print_result("Get Portfolio (Schema)", False, "Missing required keys in portfolio response")
        
    print_result("Get Portfolio", True)

def test_create_order_success():
    print("\n--- Testing Create Order (Success) ---")
    payload = {
        "instrumentId": 2, # AAPL
        "userId": 1,
        "size": 1,
        "price": 100, 
        "type": "LIMIT",
        "side": "BUY"
    }
    res = requests.post(f"{BASE_URL}/orders", json=payload)
    if res.status_code != 201:
        print_result("Create Order (Status)", False, f"Expected 201, got {res.status_code}. Response: {res.text}")
        
    data = res.json()
    if 'id' not in data:
        print_result("Create Order (Schema)", False, "Response missing ID")
        
    print_result("Create Order (Success)", True)

def test_create_order_insufficient_funds():
    print("\n--- Testing Create Order (Insufficient Funds) ---")
    payload = {
        "instrumentId": 2, # AAPL
        "userId": 1,
        "size": 1000,
        "price": 200, # 1000 * 200 = 200000 (More than available funds)
        "type": "LIMIT",
        "side": "BUY"
    }
    res = requests.post(f"{BASE_URL}/orders", json=payload)
    if res.status_code != 201:
        print_result("Create Order Insufficient Funds (Status)", False, f"Expected 201, got {res.status_code}")
        
    data = res.json()
    if data.get('status') != 'REJECTED':
        print_result("Create Order Insufficient Funds (Status Field)", False, f"Expected REJECTED, got {data.get('status')}")
        
    print_result("Create Order (Insufficient Funds)", True)

if __name__ == "__main__":
    try:
        # Before running, check if server is up
        health = requests.get("http://localhost:3000/api/instruments")
    except requests.exceptions.ConnectionError:
        print("❌ FAIL | Cannot connect to http://localhost:3000/api - Is the server running?")
        sys.exit(1)
        
    test_search_instruments()
    test_get_portfolio()
    test_create_order_success()
    test_create_order_insufficient_funds()
    print("\n🎉 All live tests passed successfully!")
