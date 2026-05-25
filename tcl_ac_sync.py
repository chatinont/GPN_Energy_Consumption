import requests
import hashlib
import time
import json
import os

# --- CONFIGURATION ---
# ใส่ข้อมูล TCL Home ของคุณที่นี่
TCL_EMAIL = "YOUR_EMAIL"
TCL_PASSWORD = "YOUR_PASSWORD"

# URL ของ Google Apps Script Web App (ได้จากการ Deploy GAS เป็น Web App)
GAS_WEBAPP_URL = "YOUR_GAS_WEBAPP_URL"

# ส่วนตัวแปร API (ปกติไม่ต้องเปลี่ยน)
BASE_URL = "https://api-us-east-1.tclhome.tcl.com" # หรือตามภูมิภาค
APP_ID = "10001" # Default App ID
SECRET = "5f2f534c4c484f4d455f534543524554" # Reverse engineered secret (TCL_HOME_SECRET)

def get_sign(params, timestamp):
    # รวม params และ timestamp เพื่อสร้าง signature
    query = "".join(f"{k}{v}" for k, v in sorted(params.items()))
    sign_str = f"{query}{timestamp}{SECRET}"
    return hashlib.md5(sign_str.encode()).hexdigest()

def login():
    print("Logging into TCL Home...")
    endpoint = f"{BASE_URL}/user/login"
    timestamp = str(int(time.time() * 1000))
    params = {
        "username": TCL_EMAIL,
        "password": hashlib.md5(TCL_PASSWORD.encode()).hexdigest(),
        "appId": APP_ID,
        "v": "2.0"
    }
    
    headers = {
        "Sign": get_sign(params, timestamp),
        "Timestamp": timestamp,
        "Content-Type": "application/json"
    }
    
    response = requests.post(endpoint, json=params, headers=headers)
    res_json = response.json()
    
    if res_json.get("retCode") == "000000":
        return res_json["data"]["token"]
    else:
        print(f"Login failed: {res_json.get('retMsg')}")
        return None

def get_ac_status(token):
    print("Fetching AC status...")
    endpoint = f"{BASE_URL}/device/getDeviceList"
    timestamp = str(int(time.time() * 1000))
    params = {"appId": APP_ID, "v": "2.0"}
    
    headers = {
        "Sign": get_sign(params, timestamp),
        "Timestamp": timestamp,
        "Token": token,
        "Content-Type": "application/json"
    }
    
    response = requests.post(endpoint, json=params, headers=headers)
    res_json = response.json()
    
    if res_json.get("retCode") == "000000":
        devices = res_json["data"]["list"]
        # กรองเฉพาะแอร์ (Air Conditioner)
        acs = [d for d in devices if "Air Conditioner" in d.get("deviceName", "")]
        return acs
    return []

def sync_to_gas(watt, total_kwh, device_name):
    print(f"Syncing {device_name} ({watt}W) to Google Sheets...")
    payload = {
        "watt": watt,
        "totalKwh": total_kwh,
        "device": device_name
    }
    try:
        res = requests.post(GAS_WEBAPP_URL, json=payload)
        print(f"Server response: {res.text}")
    except Exception as e:
        print(f"Sync error: {e}")

def main():
    if TCL_EMAIL == "YOUR_EMAIL":
        print("❌ Please configure TCL_EMAIL and TCL_PASSWORD in the script.")
        return
        
    token = login()
    if not token: return
    
    print("\n--- Device Discovery ---")
    devices = get_ac_status(token)
    if not devices:
        print("No devices found. Check your TCL Home account.")
        return
        
    print(f"Found {len(devices)} devices:")
    for d in devices:
        print(f" - [{d.get('deviceId')}] {d.get('deviceName')} (Type: {d.get('deviceType')})")
    
    # ดึงค่าเฉพาะแอร์
    # หากมีแอร์หลายตัว คุณสามารถแก้โค้ดด้านล่างเพื่อระบุชื่อหรือ ID ที่ต้องการได้
    target_acs = [d for d in devices if "Air Conditioner" in d.get("deviceName", "")]
    
    if not target_acs:
        print("No Air Conditioner found in the list.")
        return
    
    print(f"\n🚀 Starting sync for: {[ac.get('deviceName') for ac in target_acs]}")
    print("Syncing every 60 seconds (Near Real-time)...")

    while True:
        try:
            # Refresh device list to get latest status
            acs = get_ac_status(token)
            for ac in acs:
                if ac.get('deviceId') in [t.get('deviceId') for t in target_acs]:
                    # ชื่อฟิลด์ Watt/Energy อาจต่างกันในแต่ละรุ่น 
                    # ผมใส่ เผื่อไว้หลายตัว (power, p_power, f_power)
                    watt = ac.get("power", ac.get("p_power", ac.get("f_power", 0)))
                    total_kwh = ac.get("total_energy", ac.get("f_total_energy", 0))
                    
                    sync_to_gas(watt, total_kwh, ac.get("deviceName"))
                
            time.sleep(60) # อัพเดททุก 1 นาที
        except Exception as e:
            print(f"Error in loop: {e}")
            time.sleep(10) # รอแป๊บเดียวแล้วลองใหม่

if __name__ == "__main__":
    main()
