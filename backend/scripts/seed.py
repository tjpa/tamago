"""Seed demo data through the public API (skips if jobs already exist).

python scripts/seed.py [http://localhost:8390]
"""

import json
import sys
import urllib.request

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8390"


def call(method: str, path: str, body: dict | None = None):
    req = urllib.request.Request(
        BASE + path,
        method=method,
        data=json.dumps(body).encode() if body is not None else None,
        headers={"content-type": "application/json"},
    )
    with urllib.request.urlopen(req) as res:
        return json.load(res)


if call("GET", "/jobs"):
    print("jobs already exist, skipping seed")
    raise SystemExit

drivers = [
    call("POST", "/drivers", {"name": n, "phone": p})
    for n, p in [
        ("Sam Murphy", "07700 900101"),
        ("Aoife Kerr", "07700 900123"),
        ("Ciaran Doyle", "07700 900142"),
        ("Niamh Boyd", "07700 900188"),
    ]
]
vehicles = [
    call("POST", "/vehicles", {"plate": p, "kind": k})
    for p, k in [
        ("KLZ 4821", "Van"),
        ("BJZ 1183", "Van"),
        ("RXZ 9052", "Luton"),
        ("AB12 CDE", "Van"),
    ]
]

# (customer, pickup, dropoff, pence, driver index or None, final state)
jobs = [
    ("Lagan Print", "Cromac St, Belfast", "High St, Holywood", 9200, 0, "completed"),
    ("Acme Ltd", "Dock Rd, Belfast", "Church St, Antrim", 31000, 2, "completed"),
    ("Northern Tiles", "Kennedy Way, Belfast", "Shore Rd, Larne", 18000, 1, "completed"),
    ("Belfast Bikes", "Botanic Ave, Belfast", "Bridge St, Lisburn", 7400, 0, "in_transit"),
    ("McCann Builders", "Sydenham Rd, Belfast", "Quay Rd, Newry", 34000, 2, "in_transit"),
    ("Lagan Print", "Cromac St, Belfast", "Main St, Bangor", 5800, 1, "dispatched"),
    ("Acme Ltd", "Dock Rd, Belfast", "High St, Lisburn", 12500, 0, "dispatched"),
    ("Orchard Foods", "Ann St, Belfast", "Bow St, Lisburn", 9650, None, "created"),
    ("Harbour Freight NI", "Titanic Quay, Belfast", "Lurgan Rd, Craigavon", 22000, None, "created"),
]
order = ["created", "dispatched", "in_transit", "completed"]
for i, (cust, pick, drop, pence, d, final) in enumerate(jobs):
    job = call(
        "POST",
        "/jobs",
        {
            "customer_name": cust,
            "pickup_address": pick,
            "dropoff_address": drop,
            "description": "",
            "price_pence": pence,
        },
    )
    step = order.index(final)
    if step >= 1:
        call(
            "POST",
            f"/jobs/{job['id']}/dispatch",
            {"driver_id": drivers[d]["id"], "vehicle_id": vehicles[i % len(vehicles)]["id"]},
        )
    if step >= 2:
        call("POST", f"/jobs/{job['id']}/start")
    if step >= 3:
        call("POST", f"/jobs/{job['id']}/complete")
print(f"seeded {len(jobs)} jobs, {len(drivers)} drivers, {len(vehicles)} vehicles")
