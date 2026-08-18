import urllib.request, json, ssl
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE
url = "https://api.github.com/repos/40000years/Prog/actions/runs"
req = urllib.request.Request(url)
response = urllib.request.urlopen(req, context=ctx)
data = json.loads(response.read())
latest_run_id = data["workflow_runs"][0]["id"]
print("Latest Run ID:", latest_run_id)

jobs_url = f"https://api.github.com/repos/40000years/Prog/actions/runs/{latest_run_id}/jobs"
jobs_response = urllib.request.urlopen(urllib.request.Request(jobs_url), context=ctx)
jobs_data = json.loads(jobs_response.read())

for job in jobs_data["jobs"]:
    if "Provisioning" in job["name"] or "provision" in job["name"]:
        print("Provision Job ID:", job["id"])
        log_url = f"https://api.github.com/repos/40000years/Prog/actions/jobs/{job['id']}/logs"
        try:
            log_req = urllib.request.Request(log_url)
            log_response = urllib.request.urlopen(log_req, context=ctx)
            print("--- LOGS ---")
            lines = log_response.read().decode("utf-8").split("\n")
            for line in lines:
                if "t4g" in line or "t3" in line or "t2" in line or "SELECTED" in line or "Selected instance" in line or "BLOCKED" in line or "ALLOWED" in line or "Free-tier" in line or "WARNING" in line:
                    print(line)
        except Exception as e:
            print("Error fetching logs:", e)
