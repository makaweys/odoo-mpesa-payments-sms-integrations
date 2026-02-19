# Monitoring script to check if the service is running
api_url = "https://your-server.com:3000/health"

try:
    response = requests.get(api_url, timeout=5)
    if response.status_code == 200:
        log("Mpesa integration service is healthy", level="Health Check")
    else:
        log(f"Mpesa integration service returned status {response.status_code}", level="Health Check Warning")
except Exception as e:
    log(f"Mpesa integration service is unreachable: {str(e)}", level="Health Check Error")